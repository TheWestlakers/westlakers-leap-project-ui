import { Component, signal, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { HoldingService } from '../services/holding.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { PriceUpdate, PriceWebsocketService } from '../services/price-websocket.service';
import { Subject, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

/* ─── Types ───────────────────────────────────────────── */
export interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  sector: string;
}

export type SortField = 'symbol' | 'shares' | 'avgCost' | 'lastPrice' | 'marketValue' | 'unrealizedPnl';
export type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-open-positions',
  standalone: true,
  imports: [CommonModule, RouterModule, TopNavComponent],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class OpenPositionsComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  protected readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly holdingService = inject(HoldingService);
  private readonly stockDataService = inject(StockDataService);
  private readonly priceWebsocketService = inject(PriceWebsocketService);
  private readonly destroy$ = new Subject<void>();
  private readonly emptyPosition: Position = { id: '', symbol: '--', shares: 0, avgCost: 0, lastPrice: 0, marketValue: 0, unrealizedPnl: 0, unrealizedPct: 0, sector: 'Unknown' };
  readonly positionData = signal<Position[]>([]);
  private readonly authService = inject(AuthService);
  /** Account of the signed-in user. null when the user has no account yet. */
  private get accountId(): number | null {
    return this.authService.activeAccount()?.accountId ?? null;
  }
  /* ── Sort state ── */
  sortField = signal<SortField>('marketValue');
  sortDir   = signal<SortDir>('desc');

  ngOnInit(): void {
    const accountId = this.accountId;
    if (accountId === null) return;

    this.holdingService.getHoldingsByAccountId(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: holdings => {
          const positions = holdings.map(holding => ({ ...holding, lastPrice: holding.avgCost, marketValue: holding.shares * holding.avgCost, unrealizedPnl: 0, unrealizedPct: 0, sector: 'Unknown' }));
          this.positionData.set(positions);
          const symbols = positions.map(position => position.symbol);
          if (symbols.length === 0) return;

          const updatePrices = (prices: { [symbol: string]: StockPrice }) => this.positionData.update(current => current.map(position => {
            const lastPrice = prices[position.symbol]?.currentPrice ?? position.lastPrice;
            const marketValue = position.shares * lastPrice;
            const unrealizedPnl = (lastPrice - position.avgCost) * position.shares;
            const costBasis = position.avgCost * position.shares;
            return { ...position, lastPrice, marketValue, unrealizedPnl, unrealizedPct: costBasis ? unrealizedPnl / costBasis * 100 : 0 };
          }));

          this.stockDataService.getPrices(symbols).pipe(takeUntil(this.destroy$)).subscribe({ next: updatePrices, error: error => console.error('Error loading prices:', error) });
          if (isPlatformBrowser(this.platformId)) {
            this.priceWebsocketService.getPriceUpdates()
              .pipe(takeUntil(this.destroy$))
              .subscribe(update => this.applyPriceUpdate(update));
            this.priceWebsocketService.subscribe(symbols);
          }

          interval(30000).pipe(switchMap(() => this.stockDataService.getPrices(symbols)), takeUntil(this.destroy$)).subscribe({ next: updatePrices, error: error => console.error('Error polling prices:', error) });
        },
        error: error => console.error('Error loading holdings:', error),
      });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.priceWebsocketService.unsubscribe(this.positionData().map(position => position.symbol));
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyPriceUpdate(update: PriceUpdate): void {
    if (update.type !== 'price_update' || !update.ticker || !update.data) {
      return;
    }

    const ticker = update.ticker.toUpperCase();
    this.positionData.update(current => current.map(position => {
      if (position.symbol.toUpperCase() !== ticker) {
        return position;
      }
      const lastPrice = Number(update.data.currentPrice ?? position.lastPrice);
      const marketValue = position.shares * lastPrice;
      const unrealizedPnl = (lastPrice - position.avgCost) * position.shares;
      const costBasis = position.avgCost * position.shares;
      return { ...position, lastPrice, marketValue, unrealizedPnl, unrealizedPct: costBasis ? unrealizedPnl / costBasis * 100 : 0 };
    }));
  }

  /* ── Sorted positions ── */
  get positions(): Position[] {
    const field = this.sortField();
    const dir   = this.sortDir();
    return [...this.positionData()].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (typeof av === 'string' && typeof bv === 'string') {
        return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }

  /* ── Summary metrics ── */
  get totalMarketValue(): number {
    return this.positionData().reduce((s, p) => s + p.marketValue, 0);
  }

  get totalUnrealizedPnl(): number {
    return this.positionData().reduce((s, p) => s + p.unrealizedPnl, 0);
  }

  get totalUnrealizedPct(): number {
    const costBasis = this.totalMarketValue - this.totalUnrealizedPnl;
    return costBasis > 0 ? (this.totalUnrealizedPnl / costBasis) * 100 : 0;
  }

  get activeCount(): number { return this.positionData().length; }

  get bestPerformer(): Position {
    return this.positionData().reduce((best, p) => p.unrealizedPct > best.unrealizedPct ? p : best, this.emptyPosition);
  }

  get worstPerformer(): Position {
    return this.positionData().reduce((worst, p) => p.unrealizedPct < worst.unrealizedPct ? p : worst, this.emptyPosition);
  }

  /* ── Sort interaction ── */
  readonly sortableColumns: { field: SortField; label: string }[] = [
    { field: 'symbol',       label: 'SYMBOL'      },
    { field: 'shares',       label: 'SHARES'      },
    { field: 'avgCost',      label: 'AVG COST'    },
    { field: 'lastPrice',    label: 'LAST PRICE'  },
    { field: 'marketValue',  label: 'MKT VALUE'   },
    { field: 'unrealizedPnl', label: 'UNREALIZED P&L' },
  ];

  sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  sortIconClass(field: SortField): string {
    return this.sortField() === field ? 'sort-active' : 'sort-dim';
  }

  /* ── Style helpers ── */
  pnlClass(val: number): string { return val >= 0 ? 'positive' : 'negative'; }
  pnlPrefix(val: number): string { return val >= 0 ? '+' : ''; }

  rowBg(i: number): string { return i % 2 === 0 ? 'row-even' : 'row-odd'; }

  formatCurrency(val: number): string {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPnl(pnl: number, pct: number): string {
    const sign   = pnl >= 0 ? '+' : '';
    const absVal = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return `${sign}${absVal} (${sign}${pct.toFixed(2)}%)`;
  }

  /** Width % of the largest market value for the bar chart */
  barWidth(pos: Position): number {
    const max = Math.max(...this.positionData().map(p => p.marketValue), 0);
    return max ? (pos.marketValue / max) * 100 : 0;
  }
}
