import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from '../portfolio-dashboard/ai-assistant/ai-assistant.component';
import { WatchlistComponent } from '../portfolio-dashboard/watchlist/watchlist.component';
import { OrderSide, OrderType, PortfolioRange, INITIAL_WATCHLIST } from '../portfolio-dashboard/portfolio-dashboard.component';
import { ThemeService } from '../services/theme.service';
import { AccountService } from '../services/account.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { TradeService } from '../services/trade.service';
import { Subject, concatMap, interval, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

interface RangeConfig {
  linePath: string;
  fillPath: string;
  xLabels: string[];
  yLabels: string[];
  deltaValue: number;
  deltaPct: number;
}

/* ─── Chart data generator ────────────────────────────── */
function generateSvgPath(days: number, baseVal: number, endVal: number): string {
  const points: string[] = [];
  const steps = Math.min(days, 60);
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const noise    = (Math.random() - 0.4) * (endVal - baseVal) * 0.06;
    const val      = baseVal + (endVal - baseVal) * Math.pow(progress, 0.7) + noise;
    const x = (i / steps) * 680;
    const y = 200 - ((val - baseVal * 0.9) / ((endVal * 1.05) - baseVal * 0.9)) * 200;
    points.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

function generateFillPath(linePath: string): string {
  return linePath + ' L680,200 L0,200 Z';
}

function buildRangeConfig(days: number, base: number, end: number, xLbls: string[]): RangeConfig {
  const line = generateSvgPath(days, base, end);
  const delta = end - base;
  const pct   = (delta / base) * 100;
  return {
    linePath:   line,
    fillPath:   generateFillPath(line),
    xLabels:    xLbls,
    yLabels:    ['$220', '$210', '$200', '$190', '$180'],
    deltaValue: delta,
    deltaPct:   pct,
  };
}

const RANGE_DATA: Record<PortfolioRange, RangeConfig> = {
  '1D': buildRangeConfig(1,   178.50, 182.52, ['9:30', '11:00', '12:30', '14:00', '16:00']),
  '5D': buildRangeConfig(5,   175.20, 182.52, ['Mon',  'Tue',   'Wed',   'Thu',   'Fri'  ]),
  '1Y': buildRangeConfig(365, 145.80, 182.52, ['May',  'Jul',   'Sep',   'Nov',   'Jan'  ]),
  '3Y': buildRangeConfig(365 * 3, 95.50, 182.52, ['2022', '2023', '2024', 'Q1',  'Now' ]),
  '5Y': buildRangeConfig(365 * 5,  62.30, 182.52, ['2020', '2021', '2022', '2023', '2024']),
};

@Component({
  selector: 'app-stock-ticker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopNavComponent, AiAssistantComponent, WatchlistComponent],
  templateUrl: './stock-ticker.component.html',
  styleUrls: ['./stock-ticker.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class StockTickerComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  protected readonly themeService = inject(ThemeService);
  private readonly accountService = inject(AccountService);
  private readonly stockDataService = inject(StockDataService);
  private readonly tradeService = inject(TradeService);
  private readonly destroy$ = new Subject<void>();

  /* ── Account ── */
  get totalAccountValue(): number { return Number(this.accountService.account()?.settledCash ?? 0); }
  get buyingPower(): number { return Number(this.accountService.account()?.settledCash ?? 0); }
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;
  readonly accountId = 3;

  /* ── Stock symbol and price data ── */
  // Currently selected ticker for main display
  selectedTicker = signal('AAPL');
  
  // All prices from backend
  allPrices = signal<{ [symbol: string]: StockPrice }>({});
  
  // Tickers tracked by the shared watchlist component
  watchlistSymbols = signal<string[]>(INITIAL_WATCHLIST.map(item => item.symbol));
  
  // Loading and error states
  isLoadingPrices = signal(false);
  priceError = signal<string | null>(null);

  /* ── Computed values for main ticker display ── */
  currentTickerPrice = computed<StockPrice | null>(() => {
    const prices = this.allPrices();
    const ticker = this.selectedTicker();
    return prices[ticker] || null;
  });

  currentTickerName = computed(() => {
    const price = this.currentTickerPrice();
    return price?.ticker || this.selectedTicker();
  });

  stockPrice = computed(() => {
    const price = this.currentTickerPrice();
    return price ? Number(price.currentPrice) : 182.52;
  });

  stockSymbol = computed(() => this.selectedTicker());
  stockName = computed(() => this.currentTickerName());

  /* ── Stock chart ── */
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1Y', '3Y', '5Y'];
  activeRange = signal<PortfolioRange>('5D');

  get rangeData(): RangeConfig {
    return RANGE_DATA[this.activeRange()];
  }

  get currentValue(): number { return this.stockPrice(); }

  get isPositive(): boolean { return this.rangeData.deltaValue >= 0; }

  get chartColor(): string { return this.isPositive ? '#10b981' : '#ef4444'; }

  /* ── Order entry ── */
  orderSide      = signal<OrderSide>('BUY');
  orderType      = signal<OrderType>('LIMIT');
  orderSymbol    = signal(this.stockSymbol());
  orderShares    = signal(100);
  orderPrice     = signal(182.50);
  private limitPriceEdited = false;
  orderExtHours  = signal(true);
  orderSubmitted = signal(false);
  orderExecuted = signal(false);
  isSubmittingOrder = signal(false);
  orderError = signal<string | null>(null);

  get estValue(): number {
    return this.orderShares() * this.orderPrice();
  }

  get submitLabel(): string {
    if (this.orderExecuted()) return '✓ ORDER EXECUTED';
    return this.orderSubmitted() ? '✓ ORDER SUBMITTED' : `PLACE ${this.orderSide()} ORDER`;
  }

  get submitClass(): string {
    if (this.orderSubmitted()) return 'btn-submitted';
    return this.orderSide() === 'BUY' ? 'btn-buy' : 'btn-sell';
  }

  ngOnInit(): void {
    this.accountService.loadAccount(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => console.error('Error loading account:', error)
      });

    // Load prices immediately.
    this.loadPrices();

    // Keep prices fresh using the same reliable polling pattern as portfolio page.
    interval(1000)
      .pipe(
        switchMap(() => this.stockDataService.getPrices(this.watchlistSymbols())),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (prices) => {
          this.allPrices.set(prices);
          const currentTicker = this.selectedTicker();
          const tickerPrice = prices[currentTicker];
          if (tickerPrice && tickerPrice.currentPrice &&
              (this.orderType() === 'MARKET' || !this.limitPriceEdited)) {
            this.orderPrice.set(Number(tickerPrice.currentPrice));
          }
        },
        error: (error) => {
          console.error('Error polling prices:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load prices for the displayed tickers from the backend.
   */
  private loadPrices(): void {
    this.isLoadingPrices.set(true);
    this.priceError.set(null);

    this.stockDataService.getPrices(this.watchlistSymbols())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prices) => {
          this.allPrices.set(prices);
          // Initialize order price with current ticker's live price
          const currentTicker = this.selectedTicker();
          const tickerPrice = prices[currentTicker];
          if (tickerPrice && tickerPrice.currentPrice &&
              (this.orderType() === 'MARKET' || !this.limitPriceEdited)) {
            this.orderPrice.set(Number(tickerPrice.currentPrice));
          }
          this.isLoadingPrices.set(false);
        },
        error: (error) => {
          console.error('Error loading prices:', error);
          this.priceError.set('Failed to load prices. Please try again.');
          this.isLoadingPrices.set(false);
          // Keep displaying fallback data if available
        }
      });
  }

  /**
   * Refresh prices for all displayed tickers.
   */
  refreshPrices(): void {
    this.stockDataService.invalidateCache(this.watchlistSymbols());
    this.loadPrices();
  }

  /**
   * Select a ticker to display in the main chart.
   * Also updates the order entry form to reflect the selected ticker.
   */
  selectTicker(ticker: string): void {
    const upperTicker = ticker.toUpperCase();
    this.selectedTicker.set(upperTicker);
    
    // Sync order entry form with selected ticker
    this.orderSymbol.set(upperTicker);
    this.limitPriceEdited = false;
    
    // Update order price to the current price of the selected ticker
    const tickerPrice = this.allPrices()[upperTicker];
    if (tickerPrice && tickerPrice.currentPrice) {
      this.orderPrice.set(Number(tickerPrice.currentPrice));
    }
  }

  onWatchlistSymbolsChange(symbols: string[]): void {
    const normalized = symbols.map(symbol => symbol.toUpperCase());
    this.watchlistSymbols.set(normalized);

    if (normalized.length > 0 && !normalized.includes(this.selectedTicker())) {
      this.selectTicker(normalized[0]);
    }

    this.stockDataService.invalidateCache(normalized);
    this.loadPrices();
  }

  /* ── Order actions ── */
  setSide(side: OrderSide): void { this.orderSide.set(side); }
  setOrderType(type: OrderType): void {
    this.orderType.set(type);
    if (type === 'LIMIT') {
      this.limitPriceEdited = false;
      const tickerPrice = this.allPrices()[this.selectedTicker()];
      if (tickerPrice?.currentPrice) {
        this.orderPrice.set(Number(tickerPrice.currentPrice));
      }
    }
  }
  setOrderPrice(price: number): void {
    this.orderPrice.set(price);
    if (this.orderType() === 'LIMIT') {
      this.limitPriceEdited = true;
    }
  }
  incrementShares(): void { this.orderShares.update(n => n + 1); }
  decrementShares(): void { this.orderShares.update(n => Math.max(1, n - 1)); }
  toggleExtHours(): void { this.orderExtHours.update(v => !v); }

  
  submitOrder(): void {
    this.orderError.set(null);
    this.orderSubmitted.set(false);
    this.orderExecuted.set(false);

    const orderType = this.orderType();
    const orderSide = this.orderSide();
    const orderQuantity = this.orderShares();
    const orderPrice = this.orderPrice();

    this.isSubmittingOrder.set(true);
    this.tradeService.getInstrumentByTicker(this.orderSymbol()).pipe(
      switchMap(instrument => orderType === 'LIMIT'
        ? this.tradeService.createLimitTrade({
            accountId: this.accountId,
            instrumentId: instrument.instrumentId,
            side: orderSide,
            quantity: orderQuantity,
            limitPrice: orderPrice,
          })
        : this.tradeService.createMarketTrade({
            accountId: this.accountId,
            instrumentId: instrument.instrumentId,
            side: orderSide,
            quantity: orderQuantity,
            estimatedPrice: orderPrice,
          })
      ),
      concatMap(order => {
        this.orderSubmitted.set(true);
        const simulatedDelay = 1500 + Math.floor(Math.random() * 3500);
        return timer(simulatedDelay).pipe(
          switchMap(() => this.stockDataService.getPrice(this.selectedTicker())),
          switchMap(marketPrice => this.tradeService.executeTrade(
            order.orderId,
            Number(marketPrice.currentPrice)
          ))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.accountService.refreshAccount(this.accountId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isSubmittingOrder.set(false);
              this.orderExecuted.set(true);
            },
            error: (error) => {
              console.error('Error refreshing account after trade:', error);
              this.isSubmittingOrder.set(false);
              this.orderExecuted.set(true);
            }
          });
      },
      error: (error: { error?: { message?: string; details?: string }; message?: string }) => {
        this.isSubmittingOrder.set(false);
        this.orderError.set(
          error.error?.details || error.error?.message || error.message ||
          `Unable to create the ${orderType.toLowerCase()} order.`
        );
      },
    });
  }

  /* ── Style helpers ── */
  sideTabClass(tab: OrderSide | string): string {
    const active = this.orderSide();
    if (tab !== active) return 'tab-inactive';
    return tab === 'BUY' ? 'tab-buy' : 'tab-sell';
  }

  orderTypeTabClass(tab: OrderType): string {
    return this.orderType() === tab ? 'otype-active' : 'otype-inactive';
  }

  rangeTabClass(r: PortfolioRange): string {
    return this.activeRange() === r ? 'range-active' : 'range-inactive';
  }

  pnlClass(val: number): string { return val >= 0 ? 'positive' : 'negative'; }
  pnlPrefix(val: number): string { return val >= 0 ? '+' : ''; }

  formatCurrency(val: number): string {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
