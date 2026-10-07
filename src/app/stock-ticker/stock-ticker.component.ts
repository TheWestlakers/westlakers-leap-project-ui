import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from '../portfolio-dashboard/ai-assistant/ai-assistant.component';
import { Position, OrderSide, OrderType, PortfolioRange, ChartPoint, SPARKLINE_PATHS } from '../portfolio-dashboard/portfolio-dashboard.component';
import { ThemeService } from '../services/theme.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

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
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, TopNavComponent, AiAssistantComponent],
  templateUrl: './stock-ticker.component.html',
  styleUrls: ['./stock-ticker.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class StockTickerComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  protected readonly themeService = inject(ThemeService);
  private readonly stockDataService = inject(StockDataService);
  private readonly destroy$ = new Subject<void>();

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
  
  // Selected tickers for multi-display (user can choose which ones to display)
  displayedTickers = signal<string[]>(['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'MU']);
  
  // Loading and error states
  isLoadingPrices = signal(false);
  priceError = signal<string | null>(null);
  
  // UI state for adding/editing tickers
  newTickerInput = signal('');
  isEditingDisplayedTickers = signal(false);

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
  orderExtHours  = signal(true);
  orderSubmitted = signal(false);
  readonly sparklinePaths = SPARKLINE_PATHS;

  get estValue(): number {
    return this.orderShares() * this.orderPrice();
  }

  get submitLabel(): string {
    return this.orderSubmitted() ? '✓ ORDER SUBMITTED' : `PLACE ${this.orderSide()} ORDER`;
  }

  get submitClass(): string {
    if (this.orderSubmitted()) return 'btn-submitted';
    return this.orderSide() === 'BUY' ? 'btn-buy' : 'btn-sell';
  }

  ngOnInit(): void {
    // Load prices immediately
    this.loadPrices();
    
    // Then set up polling to refresh prices every 1 second
    interval(1000)
      .pipe(
        switchMap(() => this.stockDataService.getPrices(this.displayedTickers())),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (prices) => {
          this.allPrices.set(prices);
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

    this.stockDataService.getPrices(this.displayedTickers())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prices) => {
          this.allPrices.set(prices);
          // Initialize order price with current ticker's live price
          const currentTicker = this.selectedTicker();
          const tickerPrice = prices[currentTicker];
          if (tickerPrice && tickerPrice.currentPrice) {
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
    this.stockDataService.invalidateCache(this.displayedTickers());
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
    
    // Update order price to the current price of the selected ticker
    const tickerPrice = this.allPrices()[upperTicker];
    if (tickerPrice && tickerPrice.currentPrice) {
      this.orderPrice.set(Number(tickerPrice.currentPrice));
    }
  }

  /**
   * Add a new ticker to the displayed tickers list.
   */
  addDisplayedTicker(): void {
    const newTicker = this.newTickerInput().trim().toUpperCase();
    if (!newTicker) return;

    const current = this.displayedTickers();
    if (!current.includes(newTicker)) {
      this.displayedTickers.set([...current, newTicker]);
      this.newTickerInput.set('');
      
      // Load price for the new ticker
      this.stockDataService.getPrice(newTicker)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (price) => {
            this.allPrices.update(prices => ({
              ...prices,
              [newTicker]: price
            }));
          },
          error: (error) => {
            console.error(`Error loading price for ${newTicker}:`, error);
            this.priceError.set(`Failed to load price for ${newTicker}`);
          }
        });
    }
  }

  /**
   * Remove a ticker from the displayed tickers list.
   */
  removeDisplayedTicker(ticker: string): void {
    const current = this.displayedTickers();
    this.displayedTickers.set(current.filter(t => t !== ticker));
    
    // If removed ticker was selected, select the first available ticker
    if (this.selectedTicker() === ticker) {
      const newDisplay = this.displayedTickers();
      if (newDisplay.length > 0) {
        this.selectTicker(newDisplay[0]);
      }
    }
  }

  toggleDisplayedTickersEdit(): void {
    this.isEditingDisplayedTickers.update(v => !v);
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
}
