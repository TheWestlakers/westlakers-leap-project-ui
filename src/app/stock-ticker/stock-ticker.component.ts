import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from '../portfolio-dashboard/ai-assistant/ai-assistant.component';
import { WatchlistComponent } from '../portfolio-dashboard/watchlist/watchlist.component';
import { OrderSide, OrderType, PortfolioRange, INITIAL_WATCHLIST } from '../portfolio-dashboard/portfolio-dashboard.component';
import { ThemeService } from '../services/theme.service';
import { AccountService } from '../services/account.service';
import { HoldingPosition, HoldingService } from '../services/holding.service';
import { PortfolioValueService } from '../services/portfolio-value.service';
import { PriceHistoryPoint, StockDataService, StockPrice } from '../services/stock-data.service';
import { PriceWebsocketService, PriceUpdate } from '../services/price-websocket.service';
import { TradeService } from '../services/trade.service';
import { Subject, concatMap, interval, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

interface ChartPoint {
  price: number;
  timestamp: string;
}

interface ChartPlotPoint extends ChartPoint {
  x: number;
  y: number;
}

interface RangeConfig {
  linePath: string;
  fillPath: string;
  plotPoints: ChartPlotPoint[];
  xLabels: string[];
  yLabels: string[];
  deltaValue: number;
  deltaPct: number;
}

function generateFillPath(linePath: string): string {
  return linePath + ' L680,200 L0,200 Z';
}

function niceStep(rawStep: number): number {
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const normalized = rawStep / magnitude;
  const multiplier = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return multiplier * magnitude;
}

function formatAxisPrice(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatAxisTime(timestamp: string, spanMs: number): string {
  const date = new Date(timestamp);
  if (spanMs <= 2 * 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (spanMs <= 14 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  if (spanMs <= 2 * 365 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatTooltipDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const RANGE_OPTIONS: Record<PortfolioRange, { period: string; interval: string; limit: number; refreshMs: number; bucketMs: number }> = {
  '1D': { period: '1d', interval: '5m', limit: 78, refreshMs: 60_000, bucketMs: 300_000 },
  '5D': { period: '5d', interval: '15m', limit: 130, refreshMs: 300_000, bucketMs: 900_000 },
  '1M': { period: '1mo', interval: '1d', limit: 31, refreshMs: 900_000, bucketMs: 86_400_000 },
  '6M': { period: '6mo', interval: '1d', limit: 130, refreshMs: 900_000, bucketMs: 86_400_000 },
  '1Y': { period: '1y', interval: '1wk', limit: 53, refreshMs: 1_800_000, bucketMs: 604_800_000 },
  '3Y': { period: '3y', interval: '1wk', limit: 156, refreshMs: 3_600_000, bucketMs: 604_800_000 },
};

function buildRangeConfig(points: ChartPoint[]): RangeConfig {
  if (points.length === 0) {
    return { linePath: 'M0,100 L680,100', fillPath: 'M0,100 L680,100 L680,200 L0,200 Z',
      plotPoints: [], xLabels: [], yLabels: [], deltaValue: 0, deltaPct: 0 };
  }

  const prices = points.map(point => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rawStep = Math.max((max - min) / 4, Math.abs(max) * 0.0025, 0.01);
  const step = niceStep(rawStep);
  const chartMin = Math.floor(min / step) * step - step;
  const chartMax = Math.ceil(max / step) * step + step;
  const span = chartMax - chartMin || 1;
  const plotPoints = points.map((point, index): ChartPlotPoint => {
    const x = 4 + (index / Math.max(points.length - 1, 1)) * 672;
    const y = 196 - ((point.price - chartMin) / span) * 192;
    return { ...point, x, y };
  });
  const line = plotPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`
  ).join(' ');
  const first = points[0].price;
  const last = points[points.length - 1].price;
  const delta = last - first;
  const firstTimestamp = new Date(points[0].timestamp).getTime();
  const lastTimestamp = new Date(points[points.length - 1].timestamp).getTime();
  const timestampSpan = Math.max(lastTimestamp - firstTimestamp, 0);
  const labels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const point = points[Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))];
    return formatAxisTime(point.timestamp, timestampSpan);
  });
  const yLabels = [4, 3, 2, 1, 0]
    .map(level => formatAxisPrice(chartMin + span * level / 4));
  return {
    linePath:   line,
    fillPath:   generateFillPath(line),
    plotPoints,
    xLabels:    labels,
    yLabels,
    deltaValue: delta,
    deltaPct:   first === 0 ? 0 : (delta / first) * 100,
  };
}

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
  private readonly holdingService = inject(HoldingService);
  private readonly portfolioValueService = inject(PortfolioValueService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly stockDataService = inject(StockDataService);
  private readonly priceWebsocketService = inject(PriceWebsocketService);
  private readonly tradeService = inject(TradeService);
  private readonly destroy$ = new Subject<void>();
  private readonly historyReload$ = new Subject<void>();
  private clientId = '';
  private focusedTransientTicker: string | null = null;
  private websocketSymbols = new Set<string>();

  /* ── Account ── */
  get accountSummary() {
    return this.portfolioValueService.calculateSummary(
      this.accountService.account(),
      this.holdings(),
      this.allPrices(),
    );
  }
  get totalAccountValue(): number { return this.accountSummary.totalAccountValue; }
  get buyingPower(): number { return this.accountSummary.buyingPower; }
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;
  readonly accountId = 3;

  /* ── Stock symbol and price data ── */
  // Currently selected ticker for main display
  selectedTicker = signal('AAPL');
  
  // All prices from backend
  allPrices = signal<{ [symbol: string]: StockPrice }>({});
  holdings = signal<HoldingPosition[]>([]);
  
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
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1M', '6M', '1Y', '3Y'];
  activeRange = signal<PortfolioRange>('5D');
  chartPoints = signal<ChartPoint[]>([]);
  hoveredPointIndex = signal<number | null>(null);
  private rangeConfigPoints: ChartPoint[] | null = null;
  private rangeConfigCache: RangeConfig | null = null;

  get rangeData(): RangeConfig {
    const points = this.chartPoints();
    if (points !== this.rangeConfigPoints || !this.rangeConfigCache) {
      this.rangeConfigPoints = points;
      this.rangeConfigCache = buildRangeConfig(points);
    }
    return this.rangeConfigCache;
  }

  get currentValue(): number | null { return this.stockPrice(); }

  get isPositive(): boolean { return this.rangeData.deltaValue >= 0; }

  get chartColor(): string { return this.isPositive ? '#10b981' : '#ef4444'; }

  get hoveredChartPoint(): ChartPlotPoint | null {
    const index = this.hoveredPointIndex();
    return index == null ? null : this.rangeData.plotPoints[index] ?? null;
  }

  getChartHoverZoneX(index: number): number {
    const points = this.rangeData.plotPoints;
    return index === 0 ? 0 : (points[index - 1].x + points[index].x) / 2;
  }

  getChartHoverZoneWidth(index: number): number {
    const points = this.rangeData.plotPoints;
    const rightEdge = index === points.length - 1 ? 680 : (points[index].x + points[index + 1].x) / 2;
    return rightEdge - this.getChartHoverZoneX(index);
  }

  formatTooltipDate(timestamp: string): string {
    return formatTooltipDate(timestamp);
  }

  /* ── Order entry ── */
  orderSide      = signal<OrderSide>('BUY');
  orderType      = signal<OrderType>('LIMIT');
  orderSymbol    = signal(this.stockSymbol());
  orderShares    = signal(100);
  orderPrice     = signal<number | null>(null);
  private limitPriceEdited = false;
  orderExtHours  = signal(true);
  orderSubmitted = signal(false);
  orderExecuted = signal(false);
  isSubmittingOrder = signal(false);
  orderError = signal<string | null>(null);

  get estValue(): number {
    return this.orderShares() * (this.orderPrice() ?? 0);
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
    this.clientId = this.stockDataService.getOrCreateClientId();

    const initialTicker = this.route.snapshot.queryParamMap.get('symbol')?.trim().toUpperCase();
    if (initialTicker) {
      this.selectedTicker.set(initialTicker);
      this.orderSymbol.set(initialTicker);

      if (isPlatformBrowser(this.platformId) && !this.watchlistSymbols().includes(initialTicker)) {
        this.focusedTransientTicker = initialTicker;
        this.stockDataService.focusTicker(this.clientId, initialTicker)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stockDataService.syncWatchlist(this.clientId, this.watchlistSymbols())
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.priceWebsocketService.getPriceUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => this.applyPriceUpdate(update));
    this.syncWebsocketSubscriptions();
    this.startHistoryPolling();
    this.accountService.loadAccount(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => console.error('Error loading account:', error)
      });

    this.loadHoldings();

    // Load prices immediately.
    this.loadPrices();

    // Keep prices fresh using the same reliable polling pattern as portfolio page.
    interval(1000)
      .pipe(
        switchMap(() => this.stockDataService.getPrices(this.priceSymbols())),
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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.focusedTransientTicker) {
      this.stockDataService.unfocusTicker(this.clientId, this.focusedTransientTicker)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
      this.focusedTransientTicker = null;
    }

    this.priceWebsocketService.unsubscribe(Array.from(this.websocketSymbols));

    this.historyReload$.next();
    this.historyReload$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load prices for the displayed tickers from the backend.
   */
  private loadPrices(): void {
    this.isLoadingPrices.set(true);
    this.priceError.set(null);

    this.stockDataService.getPrices(this.priceSymbols())
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

  private priceSymbols(): string[] {
    return [...new Set([
      ...this.watchlistSymbols(),
      ...this.holdings().map(holding => holding.symbol),
    ])];
  }

  private loadHoldings(): void {
    this.holdingService.getHoldingsByAccountId(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: holdings => {
          this.holdings.set(holdings);
          this.loadPrices();
        },
        error: error => console.error('Error loading holdings:', error),
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
    const currentTicker = this.selectedTicker();

    if (currentTicker !== upperTicker) {
      this.releaseTransientFocus(currentTicker);
    }

    this.selectedTicker.set(upperTicker);
    this.syncWebsocketSubscriptions();
    
    // Sync order entry form with selected ticker
    this.orderSymbol.set(upperTicker);
    this.limitPriceEdited = false;
    
    // Update order price to the current price of the selected ticker
    const tickerPrice = this.allPrices()[upperTicker];
    this.orderPrice.set(tickerPrice?.currentPrice != null ? Number(tickerPrice.currentPrice) : null);
    this.startHistoryPolling();
  }

  setActiveRange(range: PortfolioRange): void {
    if (this.activeRange() === range) {
      return;
    }
    this.activeRange.set(range);
    this.startHistoryPolling();
  }

  private startHistoryPolling(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.historyReload$.next();
    const ticker = this.selectedTicker();
    const range = RANGE_OPTIONS[this.activeRange()];

    timer(0, range.refreshMs).pipe(
      switchMap(() => this.stockDataService.getPriceHistory(
        ticker, range.period, range.interval, range.limit)),
      takeUntil(this.historyReload$),
      takeUntil(this.destroy$)
    ).subscribe({
      next: points => this.chartPoints.set(points.map(point => ({
        price: point.price,
        timestamp: point.timestamp
      }))),
      error: error => console.error(`Error loading chart history for ${ticker}:`, error)
    });
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
    if (ticker === this.selectedTicker() && price.currentPrice != null) {
      this.mergeLiveChartPoint(Number(price.currentPrice), price.timestamp || new Date().toISOString());
    }
    const shouldSetInitialLimitPrice = this.orderType() === 'LIMIT' && this.orderPrice() === null;
    if (ticker === this.selectedTicker() && price.currentPrice != null &&
        (this.orderType() === 'MARKET' || shouldSetInitialLimitPrice)) {
      this.orderPrice.set(Number(price.currentPrice));
    }
  }

  private mergeLiveChartPoint(price: number, timestamp: string): void {
    const pointTime = new Date(timestamp).getTime();
    if (!Number.isFinite(pointTime)) {
      return;
    }

    const bucketSize = RANGE_OPTIONS[this.activeRange()].bucketMs;
    const bucket = Math.floor(pointTime / bucketSize) * bucketSize;
    this.chartPoints.update(points => {
      const next = [...points];
      const last = next[next.length - 1];
      if (last && Math.floor(new Date(last.timestamp).getTime() / bucketSize) * bucketSize === bucket) {
        next[next.length - 1] = { price, timestamp };
      } else {
        next.push({ price, timestamp });
      }
      return next.slice(-RANGE_OPTIONS[this.activeRange()].limit);
    });
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

    if (orderPrice === null) {
      this.orderError.set('Order price is unavailable.');
      return;
    }

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
              this.loadHoldings();
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

  formatPrice(val: number | null): string {
    return val == null ? '' : val.toFixed(2);
  }
}
