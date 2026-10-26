import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { TopNavComponent } from '../top-nav-admin.component';
import { Account, AccountService } from '../services/account.service';
import { AdminAccountService, AdminUser } from '../services/admin-account.service';
import { HoldingPosition, HoldingService } from '../services/holding.service';
import { AccountOrder, OrderService } from '../services/order.service';
import { PortfolioValueService } from '../services/portfolio-value.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { ThemeService } from '../services/theme.service';

interface AdminAccountOption {
  account: Account;
  user: AdminUser | null;
}

@Component({
  selector: 'app-admin-account-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TopNavComponent],
  templateUrl: './admin-account-view.html',
  styleUrl: './admin-account-view.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' },
})
export class AdminAccountViewComponent implements OnInit, OnDestroy {
  protected readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly adminAccountService = inject(AdminAccountService);
  private readonly accountService = inject(AccountService);
  private readonly holdingService = inject(HoldingService);
  private readonly orderService = inject(OrderService);
  private readonly portfolioValueService = inject(PortfolioValueService);
  private readonly stockDataService = inject(StockDataService);
  private readonly destroy$ = new Subject<void>();

  readonly users = signal<AdminUser[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly selectedAccountId = signal<number | null>(null);
  readonly holdings = signal<HoldingPosition[]>([]);
  readonly orders = signal<AccountOrder[]>([]);
  readonly watchlist = signal<string[]>([]);
  readonly prices = signal<{ [symbol: string]: StockPrice }>({});
  readonly isLoadingDirectory = signal(true);
  readonly isLoadingAccount = signal(false);
  readonly isUpdatingStatus = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly accountOptions = computed<AdminAccountOption[]>(() => this.accounts()
    .map(account => ({
      account,
      user: this.users().find(user => user.userId === account.userId) ?? null,
    }))
    .sort((left, right) => this.accountName(left).localeCompare(this.accountName(right))));

  readonly selectedAccount = computed(() => {
    const accountId = this.selectedAccountId();
    return accountId === null ? null : this.accounts().find(account => account.accountId === accountId) ?? null;
  });

  readonly selectedUser = computed(() => {
    const account = this.selectedAccount();
    return account === null ? null : this.users().find(user => user.userId === account.userId) ?? null;
  });

  readonly summary = computed(() => this.portfolioValueService.calculateSummary(
    this.selectedAccount(),
    this.holdings(),
    this.prices(),
  ));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    forkJoin({
      users: this.adminAccountService.getUsers(),
      accounts: this.adminAccountService.getAccounts(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ users, accounts }) => {
          this.users.set(users);
          this.accounts.set(accounts);
          this.isLoadingDirectory.set(false);
          const firstAccount = this.accountOptions()[0]?.account;
          if (firstAccount) {
            this.selectAccount(firstAccount.accountId);
          }
        },
        error: () => {
          this.isLoadingDirectory.set(false);
          this.loadError.set('Unable to load the account directory.');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectAccount(accountId: number | string | null): void {
    const normalizedId = accountId === null || accountId === '' ? null : Number(accountId);
    this.selectedAccountId.set(normalizedId);
    this.holdings.set([]);
    this.orders.set([]);
    this.watchlist.set([]);
    this.prices.set({});
    this.loadError.set(null);

    if (normalizedId === null || Number.isNaN(normalizedId)) {
      return;
    }

    this.isLoadingAccount.set(true);
    forkJoin({
      account: this.accountService.loadAccount(normalizedId),
      holdings: this.holdingService.getHoldingsByAccountId(normalizedId),
      orders: this.orderService.getOrdersByAccountId(normalizedId),
      watchlist: this.stockDataService.getAccountWatchlist(normalizedId),
    })
      .pipe(
        switchMap(snapshot => {
          const symbols = Array.from(new Set([
            ...snapshot.holdings.map(holding => holding.symbol),
            ...snapshot.watchlist.tickers,
          ]));
          const prices$ = symbols.length
            ? this.stockDataService.getPrices(symbols).pipe(catchError(() => of({} as { [symbol: string]: StockPrice })))
            : of({} as { [symbol: string]: StockPrice });
          return prices$.pipe(map(prices => ({ ...snapshot, prices })));
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ account, holdings, orders, watchlist, prices }) => {
          this.accounts.update(accounts => accounts.map(item => item.accountId === account.accountId ? account : item));
          this.holdings.set(holdings);
          this.orders.set(orders);
          this.watchlist.set(watchlist.tickers);
          this.prices.set(prices);
          this.isLoadingAccount.set(false);
        },
        error: () => {
          this.isLoadingAccount.set(false);
          this.loadError.set('Unable to load this account view.');
        },
      });
  }

  toggleFreeze(): void {
    const account = this.selectedAccount();
    if (!account) {
      return;
    }

    const shouldFreeze = account.statusName.toUpperCase() !== 'FROZEN';
    this.isUpdatingStatus.set(true);
    this.adminAccountService.setTradingFrozen(account.accountId, shouldFreeze)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updatedAccount => {
          this.accounts.update(accounts => accounts.map(item => item.accountId === updatedAccount.accountId ? updatedAccount : item));
          this.isUpdatingStatus.set(false);
        },
        error: () => {
          this.isUpdatingStatus.set(false);
          this.loadError.set('Unable to update trading access for this account.');
        },
      });
  }

  accountName(option: AdminAccountOption): string {
    const userName = option.user ? `${option.user.firstName} ${option.user.lastName}`.trim() : `User ${option.account.userId}`;
    return `${userName} · Account #${option.account.accountId}`;
  }

  positionPrice(holding: HoldingPosition): number {
    return Number(this.prices()[holding.symbol]?.currentPrice ?? holding.avgCost);
  }

  positionValue(holding: HoldingPosition): number {
    return holding.shares * this.positionPrice(holding);
  }

  positionPnl(holding: HoldingPosition): number {
    return (this.positionPrice(holding) - holding.avgCost) * holding.shares;
  }

  watchlistPrice(symbol: string): number | null {
    const price = this.prices()[symbol.toUpperCase()]?.currentPrice;
    return price === undefined ? null : Number(price);
  }

  orderPrice(order: AccountOrder): number | null {
    return order.executionPrice ?? order.limitPrice;
  }

  formatCurrency(value: number): string {
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(value: Date | null): string {
    return value ? value.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '--';
  }

  pnlClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }
}
