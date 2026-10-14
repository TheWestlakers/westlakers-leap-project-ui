import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from '../portfolio-dashboard/ai-assistant/ai-assistant.component';
import { WatchlistComponent } from '../portfolio-dashboard/watchlist/watchlist.component';
import { OrderSide, OrderType, PortfolioRange, INITIAL_WATCHLIST } from '../portfolio-dashboard/portfolio-dashboard.component';
import { ThemeService } from '../services/theme.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PriceWebsocketService, PriceUpdate } from '../services/price-websocket.service';

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
  private readonly route = inject(ActivatedRoute);
  private readonly stockDataService = inject(StockDataService);
  private readonly priceWebsocketService = inject(PriceWebsocketService);
  private readonly destroy$ = new Subject<void>();
  private clientId = '';
  private focusedTransientTicker: string | null = null;
  private websocketSymbols = new Set<string>();

  /* ── Account ── */
  readonly totalAccountValue = 248512.90;
  readonly buyingPower       =  94210.45;
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;

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
  symbolLookup = '';

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

  stockPrice = computed<number | null>(() => {
    const price = this.currentTickerPrice();
    return price?.currentPrice != null ? Number(price.currentPrice) : null;
  });

  stockSymbol = computed(() => this.selectedTicker());
  stockName = computed(() => this.currentTickerName());

  /* ── Stock chart ── */
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1Y', '3Y', '5Y'];
  activeRange = signal<PortfolioRange>('5D');

  get rangeData(): RangeConfig {
    return RANGE_DATA[this.activeRange()];
  }

  get currentValue(): number | null { return this.stockPrice(); }

  get isPositive(): boolean { return this.rangeData.deltaValue >= 0; }

  get chartColor(): string { return this.isPositive ? '#10b981' : '#ef4444'; }

  /* ── Order entry ── */
  orderSide      = signal<OrderSide>('BUY');
  orderType      = signal<OrderType>('LIMIT');
  orderSymbol    = signal(this.stockSymbol());
  orderShares    = signal(100);
  orderPrice     = signal<number | null>(null);
  orderExtHours  = signal(true);
  orderSubmitted = signal(false);

  get estValue(): number {
    return this.orderShares() * (this.orderPrice() ?? 0);
  }

  get submitLabel(): string {
    return this.orderSubmitted() ? '✓ ORDER SUBMITTED' : `PLACE ${this.orderSide()} ORDER`;
  }

  get submitClass(): string {
    if (this.orderSubmitted()) return 'btn-submitted';
    return this.orderSide() === 'BUY' ? 'btn-buy' : 'btn-sell';
  }

  ngOnInit(): void {
    this.clientId = this.stockDataService.getOrCreateClientId();

    const initialTicker = this.route.snapshot.queryParamMap.get('symbol')?.trim().toUpperCase();
    if (initialTicker) {
      this.selectedTicker.set(initialTicker);
      this.orderSymbol.set(initialTicker);

      if (!this.watchlistSymbols().includes(initialTicker)) {
        this.focusedTransientTicker = initialTicker;
        this.stockDataService.focusTicker(this.clientId, initialTicker)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    }

    this.stockDataService.syncWatchlist(this.clientId, this.watchlistSymbols())
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.priceWebsocketService.getPriceUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => this.applyPriceUpdate(update));
    this.syncWebsocketSubscriptions();
  }

  ngOnDestroy(): void {
    if (this.focusedTransientTicker) {
      this.stockDataService.unfocusTicker(this.clientId, this.focusedTransientTicker)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      this.focusedTransientTicker = null;
    }

    this.priceWebsocketService.unsubscribe(Array.from(this.websocketSymbols));

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Select a ticker to display in the main chart.
   * Also updates the order entry form to reflect the selected ticker.
   */
  selectTicker(ticker: string): void {
    const upperTicker = ticker.toUpperCase();
    const currentTicker = this.selectedTicker();

    if (currentTicker !== upperTicker) {
      this.releaseTransientFocus(currentTicker);
    }

    this.selectedTicker.set(upperTicker);
    this.syncWebsocketSubscriptions();
    
    // Sync order entry form with selected ticker
    this.orderSymbol.set(upperTicker);
    
    // Update order price to the current price of the selected ticker
    const tickerPrice = this.allPrices()[upperTicker];
    this.orderPrice.set(tickerPrice?.currentPrice != null ? Number(tickerPrice.currentPrice) : null);
  }

  onWatchlistSymbolsChange(symbols: string[]): void {
    const normalized = symbols.map(symbol => symbol.toUpperCase());
    this.watchlistSymbols.set(normalized);

    this.stockDataService.syncWatchlist(this.clientId, normalized)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    if (this.focusedTransientTicker && normalized.includes(this.focusedTransientTicker)) {
      this.stockDataService.unfocusTicker(this.clientId, this.focusedTransientTicker)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      this.focusedTransientTicker = null;
    }

    if (normalized.length > 0 && !normalized.includes(this.selectedTicker()) && !this.focusedTransientTicker) {
      this.selectTicker(normalized[0]);
    }

    this.syncWebsocketSubscriptions();
  }

  addFocusedTicker(): void {
    const symbol = this.symbolLookup.trim().toUpperCase();
    if (!symbol) {
      return;
    }

    const inWatchlist = this.watchlistSymbols().includes(symbol);

    if (inWatchlist) {
      this.selectTicker(symbol);
      this.symbolLookup = '';
      return;
    }

    this.focusedTransientTicker = symbol;
    this.stockDataService.focusTicker(this.clientId, symbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.selectTicker(symbol);
      });

    this.symbolLookup = '';
  }

  private releaseTransientFocus(ticker: string): void {
    const normalized = ticker.toUpperCase();
    const isWatchlistTicker = this.watchlistSymbols().includes(normalized);
    if (this.focusedTransientTicker !== normalized || isWatchlistTicker) {
      return;
    }

    this.stockDataService.unfocusTicker(this.clientId, normalized)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.focusedTransientTicker = null;
  }

  private getWebsocketSymbols(): string[] {
    const symbols = [...this.watchlistSymbols(), this.selectedTicker()];
    return Array.from(new Set(symbols.map(symbol => symbol.toUpperCase())));
  }

  private syncWebsocketSubscriptions(): void {
    const desiredSymbols = new Set(this.getWebsocketSymbols());
    const symbolsToSubscribe = Array.from(desiredSymbols)
      .filter(symbol => !this.websocketSymbols.has(symbol));
    const symbolsToUnsubscribe = Array.from(this.websocketSymbols)
      .filter(symbol => !desiredSymbols.has(symbol));

    if (symbolsToSubscribe.length > 0) {
      this.priceWebsocketService.subscribe(symbolsToSubscribe);
    }
    if (symbolsToUnsubscribe.length > 0) {
      this.priceWebsocketService.unsubscribe(symbolsToUnsubscribe);
    }

    this.websocketSymbols = desiredSymbols;
  }

  private applyPriceUpdate(update: PriceUpdate): void {
    if (update.type === 'subscription_confirmed') {
      this.isLoadingPrices.set(false);
      return;
    }

    if (update.type !== 'price_update' || !update.ticker || !update.data) {
      return;
    }

    const ticker = update.ticker.toUpperCase();
    const price = {
      ...update.data,
      ticker,
      symbol: update.data.symbol || ticker,
      timestamp: update.data.timestamp || new Date(update.timestamp || Date.now()).toISOString()
    } as StockPrice;

    this.allPrices.update(prices => ({ ...prices, [ticker]: price }));
    const shouldSetInitialLimitPrice = this.orderType() === 'LIMIT' && this.orderPrice() === null;
    if (ticker === this.selectedTicker() && price.currentPrice != null &&
        (this.orderType() === 'MARKET' || shouldSetInitialLimitPrice)) {
      this.orderPrice.set(Number(price.currentPrice));
    }
  }

  /* ── Order actions ── */
  setSide(side: OrderSide): void { this.orderSide.set(side); }
  setOrderType(type: OrderType): void { this.orderType.set(type); }
  incrementShares(): void { this.orderShares.update(n => n + 1); }
  decrementShares(): void { this.orderShares.update(n => Math.max(1, n - 1)); }
  toggleExtHours(): void { this.orderExtHours.update(v => !v); }

  
  submitOrder(): void {
    this.orderSubmitted.set(true);
    setTimeout(() => this.orderSubmitted.set(false), 2500);
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

  formatPrice(val: number | null): string {
    return val == null ? '' : val.toFixed(2);
  }
}
