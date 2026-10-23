import { Component, OnInit, OnDestroy, PLATFORM_ID, computed, signal, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { TopNavComponent } from '../top-nav.component';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { AccountService } from '../services/account.service';
import { HoldingService } from '../services/holding.service';
import { StockDataService } from '../services/stock-data.service';
import { PortfolioValueService } from '../services/portfolio-value.service';
import { AccountOrder, OrderService, OrderSide, OrderStatusName, OrderType } from '../services/order.service';

export type TransactionStatus = 'Executed' | 'Pending' | 'Cancelled' | 'Rejected';

export interface Transaction {
  id: string;
  orderId: number;
  placedAt: Date | null;
  date: string;
  time: string;
  symbol: string;
  name: string;
  orderType: OrderType;
  side: OrderSide;
  qty: number;
  /** Execution price for executed orders, otherwise the limit price (null for unfilled market orders). */
  price: number | null;
  /** Signed cash impact: negative for buys, positive for sells. null until the order executes. */
  totalAmount: number | null;
  /** Realized P&L for executed sells (average-cost method). */
  realizedPnl: number | null;
  /** Average-cost basis of the shares sold by an executed sell. */
  soldCostBasis: number | null;
  status: TransactionStatus;
}

export type DateRangeOption = 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'This Year' | 'All Time';
export type OrderTypeOption = 'All Types' | 'Market' | 'Limit';
export type StatusOption = 'All Statuses' | TransactionStatus;

const PAGE_SIZE = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<OrderStatusName, TransactionStatus> = {
  PENDING: 'Pending',
  EXECUTED: 'Executed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

interface Period {
  start: number;
  end: number;
}

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopNavComponent],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class TransactionHistoryComponent implements OnInit, OnDestroy {
  protected readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly holdingService = inject(HoldingService);
  private readonly stockDataService = inject(StockDataService);
  private readonly portfolioValueService = inject(PortfolioValueService);
  private readonly orderService = inject(OrderService);
  private readonly destroy$ = new Subject<void>();

  /** Account of the signed-in user. null when the user has no account yet. */
  private get accountId(): number | null {
    return this.authService.activeAccount()?.accountId ?? null;
  }

  /* ── Signals ── */
  readonly transactions = signal<Transaction[]>([]);
  readonly isLoading    = signal(false);
  readonly loadError    = signal<string | null>(null);
  readonly netLiqValue  = signal(0);

  symbolFilter = signal('');
  dateRange    = signal<DateRangeOption>('All Time');
  orderType    = signal<OrderTypeOption>('All Types');
  statusFilter = signal<StatusOption>('All Statuses');
  currentPage  = signal(1);

  /* ── Filter options ── */
  dateRangeOptions: DateRangeOption[] = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year', 'All Time'];
  orderTypeOptions: OrderTypeOption[] = ['All Types', 'Market', 'Limit'];
  statusOptions:    StatusOption[]    = ['All Statuses', 'Executed', 'Pending', 'Cancelled', 'Rejected'];

  /* ── Derived state ── */
  readonly filteredTransactions = computed(() => {
    const sym = this.symbolFilter().trim().toUpperCase();
    const type = this.orderType();
    const status = this.statusFilter();
    const period = this.currentPeriod();

    return this.transactions().filter(tx => {
      if (sym && !tx.symbol.toUpperCase().includes(sym)) return false;
      if (type !== 'All Types' && tx.orderType !== type.toUpperCase()) return false;
      if (status !== 'All Statuses' && tx.status !== status) return false;
      if (period && !this.inPeriod(tx, period)) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTransactions().length / PAGE_SIZE)));

  readonly pagedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredTransactions().slice(start, start + PAGE_SIZE);
  });

  readonly pageNumbers = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage();
    const pages: (number | '...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  readonly showingStart = computed(() =>
    this.filteredTransactions().length === 0 ? 0 : (this.currentPage() - 1) * PAGE_SIZE + 1);
  readonly showingEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.filteredTransactions().length));

  /* ── Summary stats (executed orders in the selected date range) ── */
  readonly periodLabel = computed(() => {
    const labels: Record<DateRangeOption, string> = {
      'Last 7 Days': '7D', 'Last 30 Days': '30D', 'Last 90 Days': '90D', 'This Year': 'YTD', 'All Time': 'ALL TIME',
    };
    return labels[this.dateRange()];
  });

  private readonly currentPeriod = computed(() => this.periodFor(this.dateRange()));

  /** The equal-length period immediately before the current one; null for All Time. */
  private readonly previousPeriod = computed<Period | null>(() => {
    const period = this.currentPeriod();
    if (!period) return null;
    const length = period.end - period.start;
    return { start: period.start - length, end: period.start };
  });

  private readonly currentStats = computed(() => this.statsFor(this.currentPeriod()));
  private readonly previousStats = computed(() => {
    const period = this.previousPeriod();
    return period ? this.statsFor(period) : null;
  });

  readonly totalTrades = computed(() => this.currentStats().trades);
  readonly totalVolume = computed(() => this.currentStats().volume);
  readonly realizedPnl = computed(() => this.currentStats().realizedPnl);

  readonly tradeChangePct = computed(() => {
    const prev = this.previousStats();
    if (!prev || prev.trades === 0) return null;
    return (this.currentStats().trades - prev.trades) / prev.trades * 100;
  });

  readonly volumeChange = computed(() => {
    const prev = this.previousStats();
    return prev ? this.currentStats().volume - prev.volume : null;
  });

  readonly pnlYield = computed(() => {
    const { realizedPnl, soldCostBasis } = this.currentStats();
    return soldCostBasis > 0 ? realizedPnl / soldCostBasis * 100 : null;
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadOrders();
    this.loadNetLiq();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Data loading ── */
  loadOrders(): void {
    const accountId = this.accountId;
    if (accountId === null) {
      this.transactions.set([]);
      return;
    }

    this.isLoading.set(true);
    this.loadError.set(null);
    this.orderService.getOrdersByAccountId(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: orders => {
          this.transactions.set(this.toTransactions(orders));
          this.currentPage.update(page => Math.min(page, this.totalPages()));
          this.isLoading.set(false);
        },
        error: error => {
          console.error('Error loading order history:', error);
          this.loadError.set('Unable to load your order history. Please try again.');
          this.isLoading.set(false);
        },
      });
  }

  private loadNetLiq(): void {
    const accountId = this.accountId;
    if (accountId === null) return;

    forkJoin({
      account: this.accountService.loadAccount(accountId),
      holdings: this.holdingService.getHoldingsByAccountId(accountId),
    }).pipe(
      switchMap(({ account, holdings }) => {
        const symbols = holdings.map(holding => holding.symbol);
        const prices$ = symbols.length
          ? this.stockDataService.getPrices(symbols).pipe(catchError(() => of({})))
          : of({});
        return prices$.pipe(map(prices => this.portfolioValueService.calculateSummary(account, holdings, prices)));
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: summary => this.netLiqValue.set(summary.totalAccountValue),
      error: error => console.error('Error loading account value:', error),
    });
  }

  /** Builds table rows and attributes realized P&L to sells using the average-cost method. */
  private toTransactions(orders: AccountOrder[]): Transaction[] {
    const realizedByOrderId = new Map<number, { pnl: number; costBasis: number }>();
    const positions = new Map<number, { qty: number; avgCost: number }>();

    const executedOldestFirst = orders
      .filter(order => order.status === 'EXECUTED' && order.executionPrice !== null)
      .sort((a, b) => this.executedTime(a) - this.executedTime(b));

    for (const order of executedOldestFirst) {
      const price = order.executionPrice!;
      const position = positions.get(order.instrumentId) ?? { qty: 0, avgCost: 0 };
      if (order.side === 'BUY') {
        const qty = position.qty + order.quantity;
        const avgCost = qty > 0 ? (position.qty * position.avgCost + order.quantity * price) / qty : 0;
        positions.set(order.instrumentId, { qty, avgCost });
      } else {
        const costBasis = order.quantity * position.avgCost;
        realizedByOrderId.set(order.orderId, { pnl: order.quantity * price - costBasis, costBasis });
        positions.set(order.instrumentId, { qty: Math.max(0, position.qty - order.quantity), avgCost: position.avgCost });
      }
    }

    return orders.map(order => {
      const executed = order.status === 'EXECUTED' && order.executionPrice !== null;
      const notional = executed ? order.quantity * order.executionPrice! : null;
      const realized = realizedByOrderId.get(order.orderId);
      const timestamp = order.executedAt ?? order.placedAt;
      return {
        id: String(order.orderId),
        orderId: order.orderId,
        placedAt: order.placedAt,
        date: timestamp ? this.formatDate(timestamp) : '–',
        time: timestamp ? this.formatTime(timestamp) : '',
        symbol: order.symbol,
        name: order.name,
        orderType: order.orderType,
        side: order.side,
        qty: order.quantity,
        price: executed ? order.executionPrice : order.limitPrice,
        totalAmount: notional === null ? null : order.side === 'BUY' ? -notional : notional,
        realizedPnl: realized?.pnl ?? null,
        soldCostBasis: realized?.costBasis ?? null,
        status: STATUS_LABELS[order.status] ?? 'Pending',
      };
    });
  }

  private executedTime(order: AccountOrder): number {
    return (order.executedAt ?? order.placedAt)?.getTime() ?? 0;
  }

  private periodFor(range: DateRangeOption): Period | null {
    const now = Date.now();
    switch (range) {
      case 'Last 7 Days':  return { start: now - 7 * DAY_MS, end: now };
      case 'Last 30 Days': return { start: now - 30 * DAY_MS, end: now };
      case 'Last 90 Days': return { start: now - 90 * DAY_MS, end: now };
      case 'This Year':    return { start: new Date(new Date().getFullYear(), 0, 1).getTime(), end: now };
      case 'All Time':     return null;
    }
  }

  private inPeriod(tx: Transaction, period: Period): boolean {
    const time = tx.placedAt?.getTime();
    return time !== undefined && time >= period.start && time <= period.end;
  }

  private statsFor(period: Period | null) {
    const executed = this.transactions().filter(tx =>
      tx.status === 'Executed' && (!period || this.inPeriod(tx, period)));
    return {
      trades: executed.length,
      volume: executed.reduce((sum, tx) => sum + Math.abs(tx.totalAmount ?? 0), 0),
      realizedPnl: executed.reduce((sum, tx) => sum + (tx.realizedPnl ?? 0), 0),
      soldCostBasis: executed.reduce((sum, tx) => sum + (tx.soldCostBasis ?? 0), 0),
    };
  }

  /* ── Actions ── */
  setPage(page: number | '...'): void {
    if (typeof page === 'number') this.currentPage.set(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update((p) => p + 1);
  }

  onSymbolInput(value: string): void {
    this.symbolFilter.set(value);
    this.currentPage.set(1);
  }

  onDateRangeChange(value: string): void {
    this.dateRange.set(value as DateRangeOption);
    this.currentPage.set(1);
  }

  onOrderTypeChange(value: string): void {
    this.orderType.set(value as OrderTypeOption);
    this.currentPage.set(1);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as StatusOption);
    this.currentPage.set(1);
  }

  exportCsv(): void {
    const header = 'Order ID,Date,Time,Symbol,Order Type,Side,Qty,Price,Total Amount,Status';
    const rows = this.filteredTransactions().map((t) =>
      [t.orderId, t.date, t.time, t.symbol, t.orderType, t.side, t.qty, t.price ?? '', t.totalAmount ?? '', t.status].join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'order-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  trackByOrderId(_index: number, tx: Transaction): number {
    return tx.orderId;
  }

  /* ── Style helpers ── */
  sideClass(side: OrderSide): string {
    return side === 'BUY' ? 'side-buy' : 'side-sell';
  }

  statusClass(status: TransactionStatus): string {
    const map: Record<TransactionStatus, string> = {
      Executed: 'status-filled', Pending: 'status-pending',
      Cancelled: 'status-cancelled', Rejected: 'status-rejected',
    };
    return map[status];
  }

  amountClass(amount: number | null): string {
    if (amount === null) return '';
    return amount >= 0 ? 'amount-positive' : 'amount-negative';
  }

  formatAmount(amount: number | null): string {
    if (amount === null) return '–';
    const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount >= 0 ? `+$${abs}` : `-$${abs}`;
  }

  formatPrice(price: number | null, orderType: OrderType): string {
    if (price === null) return orderType === 'MARKET' ? 'MKT' : '–';
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatSignedPct(pct: number): string {
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }

  formatSignedCurrency(value: number): string {
    const abs = Math.abs(value);
    const text = abs >= 1000
      ? `$${(abs / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`
      : `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${value >= 0 ? '+' : '-'}${text}`;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false });
  }
}
