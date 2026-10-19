import { Component, OnInit, signal, computed, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from './ai-assistant/ai-assistant.component';
import { TradeHereComponent } from './trade-here/trade-here.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { AccountService } from '../services/account.service';
import { PortfolioValueService } from '../services/portfolio-value.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { HoldingService } from '../services/holding.service';
import { PriceUpdate, PriceWebsocketService } from '../services/price-websocket.service';
import { interval, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';

/* ─── Shared types ────────────────────────────────────── */
export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  positive: boolean;
  /** key into SPARKLINE_SVGS */
  sparkKey: 'up1' | 'down1' | 'up2' | 'up3' | 'down2';
}

export interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type PortfolioRange = '1D' | '5D' | '1M' | '6M' | '1Y' | '3Y';

export interface ChartPoint {
  x: number; // 0–100 percent along x axis
  y: number; // 0–100 percent from bottom
  label: string;
}

/* ─── Seed data ───────────────────────────────────────── */
export const INITIAL_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',       price: 182.52, change: 1.24,  positive: true,  sparkKey: 'up1'  },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',  price: 415.60, change: -0.42, positive: false, sparkKey: 'down1' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',        price: 176.54, change: 4.12,  positive: true,  sparkKey: 'up2'  },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',  price: 174.42, change: 0.85,  positive: true,  sparkKey: 'up3'  },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',    price: 151.60, change: -1.15, positive: false, sparkKey: 'down2' },
  { symbol: 'MU',    name: 'Micron Technology',  price: 98.35,  change: 2.41,  positive: true,  sparkKey: 'up1'  },
];

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

interface RangeConfig {
  linePath: string;
  fillPath: string;
  xLabels: string[];
  yLabels: string[];
  deltaValue: number;
  deltaPct: number;
}

interface MarketClock {
  name: string;
  code: string;
  timeZone: string;
  hours: string;
  time: string;
  status: string;
  isOpen: boolean;
}

const MARKET_DEFINITIONS = [
  { name: 'NYSE', code: 'US', timeZone: 'America/New_York', hours: '09:30 - 16:00', open: [9, 30], close: [16, 0], weekdays: [1, 2, 3, 4, 5] },
  { name: 'Nasdaq', code: 'US', timeZone: 'America/New_York', hours: '09:30 - 16:00', open: [9, 30], close: [16, 0], weekdays: [1, 2, 3, 4, 5] },
  { name: 'Cboe US', code: 'US', timeZone: 'America/New_York', hours: '09:30 - 16:00', open: [9, 30], close: [16, 0], weekdays: [1, 2, 3, 4, 5] },
  { name: 'London', code: 'UK', timeZone: 'Europe/London', hours: '08:00 - 16:30', open: [8, 0], close: [16, 30], weekdays: [1, 2, 3, 4, 5] },
  { name: 'NSE / BSE', code: 'IN', timeZone: 'Asia/Kolkata', hours: '09:15 - 15:30', open: [9, 15], close: [15, 30], weekdays: [1, 2, 3, 4, 5] },
  { name: 'Forex', code: 'FX', timeZone: 'America/New_York', hours: '24 hours / 5 days', open: [17, 0], close: [17, 0], weekdays: [0, 1, 2, 3, 4, 5] },
  { name: 'Crypto', code: '24/7', timeZone: 'UTC', hours: '24 hours / 7 days', open: [0, 0], close: [24, 0], weekdays: [0, 1, 2, 3, 4, 5, 6] },
] as const;

function buildRangeConfig(days: number, base: number, end: number, xLbls: string[]): RangeConfig {
  const line = generateSvgPath(days, base, end);
  const delta = end - base;
  const pct   = (delta / base) * 100;
  return {
    linePath:   line,
    fillPath:   generateFillPath(line),
    xLabels:    xLbls,
    yLabels:    ['260k', '245k', '230k', '215k', '200k'],
    deltaValue: delta,
    deltaPct:   pct,
  };
}

const RANGE_DATA: Record<PortfolioRange, RangeConfig> = {
  '1D': buildRangeConfig(1,   244800, 248512.90, ['9:30', '11:00', '12:30', '14:00', '16:00']),
  '5D': buildRangeConfig(5,   241200, 248512.90, ['Mon',  'Tue',   'Wed',   'Thu',   'Fri'  ]),
  '1M': buildRangeConfig(30,  232000, 248512.90, ['Mar 18', 'Mar 25', 'Apr 1', 'Apr 8', 'Apr 15']),
  '6M': buildRangeConfig(182, 210000, 248512.90, ['Oct', 'Dec', 'Feb', 'Mar', 'Apr']),
  '1Y': buildRangeConfig(365, 198000, 248512.90, ['May',  'Jul',   'Sep',   'Nov',   'Jan'  ]),
  '3Y': buildRangeConfig(365 * 3, 142000, 248512.90, ['2022', '2023', '2024', 'Q1',  'Now' ]),
};

/* ─── Inline sparkline SVG paths ─────────────────────── */
export const SPARKLINE_PATHS: Record<WatchlistItem['sparkKey'], string> = {
  up1:   'M0,20 C5,18 10,14 15,12 C20,10 25,9 30,8 C35,7 40,6 45,5 C50,4 55,3 60,2',
  down1: 'M0,4  C5,5  10,7  15,10 C20,12 25,14 30,15 C35,16 40,17 45,18 C50,19 55,20 60,20',
  up2:   'M0,22 C8,20 12,16 20,12 C28,8  35,6  45,5  C52,4  56,3  60,2',
  up3:   'M0,18 C10,16 18,14 28,12 C38,10 46,8  54,6  C58,5  60,4',
  down2: 'M0,5  C5,6  12,9  20,12 C28,15 38,17 48,19 C54,20 58,21 60,22',
};

@Component({
  selector: 'app-portfolio-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopNavComponent, AiAssistantComponent, TradeHereComponent, WatchlistComponent],
  templateUrl: './portfolio-dashboard.component.html',
  styleUrls: ['./portfolio-dashboard.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class PortfolioDashboardComponent implements OnInit, OnDestroy {
  readonly Math = Math;
  protected readonly themeService = inject(ThemeService);
  private readonly accountService = inject(AccountService);
  private readonly portfolioValueService = inject(PortfolioValueService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly stockDataService = inject(StockDataService);
  private readonly priceWebsocketService = inject(PriceWebsocketService);
  private readonly holdingService = inject(HoldingService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly websocketSymbols = new Set<string>();
  private readonly positionSymbols = new Set<string>();
  private subscribedWatchlistSymbols = new Set<string>();
  private clientId = '';

  /* ── Account ── */
  /** Account of the signed-in user. null when the user has no account yet. */
  private get accountId(): number | null {
    return this.authService.activeAccount()?.accountId ?? null;
  }
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;

  get totalAccountValue(): number {
    return this.accountSummary.totalAccountValue;
  }
  get buyingPower(): number { return this.accountSummary.buyingPower; }

  get accountSummary() {
    return this.portfolioValueService.calculateSummary(
      this.accountService.account(),
      this.positions(),
      this.allPrices(),
    );
  }

  /* ── Stock prices ── */
  allPrices = signal<{ [symbol: string]: StockPrice }>({});
  searchValue = '';
  readonly clockNow = signal(new Date());
  readonly userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  get userLocalTime(): string {
    return this.formatTime(this.clockNow(), this.userTimeZone, true);
  }

  get marketClocks(): MarketClock[] {
    return MARKET_DEFINITIONS.map(market => this.getMarketClock(market, this.clockNow()));
  }

  /* ── Positions ── */
  readonly positions = signal<Position[]>([]);
  readonly COMPACT_LIMIT = 3;

  /* ── Portfolio chart ── */
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1M', '6M', '1Y', '3Y'];
  activeRange = signal<PortfolioRange>('5D');

  /* ── Order form ── */
  orderSide = signal<OrderSide>('BUY');
  orderType = signal<OrderType>('LIMIT');

  get rangeData(): RangeConfig {
    return RANGE_DATA[this.activeRange()];
  }

  get currentValue(): number { return this.totalAccountValue; }

  get isPositive(): boolean { return this.rangeData.deltaValue >= 0; }

  get chartColor(): string { return this.isPositive ? '#10b981' : '#ef4444'; }

  submitTickerSearch(): void {
    const ticker = this.searchValue.trim().toUpperCase();
    if (!ticker) {
      return;
    }

    this.router.navigate(['/stock-ticker'], { queryParams: { symbol: ticker } });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      interval(1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.clockNow.set(new Date()));
    }

    const accountId = this.accountId;
    if (accountId === null) return;

    this.accountService.loadAccount(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => console.error('Error loading account:', error)
      });

    this.holdingService.getHoldingsByAccountId(accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: holdings => {
          const positions = holdings.map(holding => ({
            ...holding,
            lastPrice: holding.avgCost,
            marketValue: holding.shares * holding.avgCost,
            unrealizedPnl: 0,
            unrealizedPct: 0,
          }));
          this.positions.set(positions);

          const symbols = positions.map(position => position.symbol);
          if (symbols.length === 0) return;

          if (isPlatformBrowser(this.platformId)) {
            const normalizedSymbols = symbols.map(symbol => symbol.toUpperCase());
            this.priceWebsocketService.subscribe(normalizedSymbols);
            normalizedSymbols.forEach(symbol => {
              this.positionSymbols.add(symbol);
              this.websocketSymbols.add(symbol);
            });
          }

          const updatePrices = (prices: { [symbol: string]: StockPrice }) => {
            this.allPrices.update(current => ({ ...current, ...prices }));
            this.positions.update(current => current.map(position => {
              const lastPrice = prices[position.symbol]?.currentPrice ?? position.lastPrice;
              const marketValue = position.shares * lastPrice;
              const unrealizedPnl = (lastPrice - position.avgCost) * position.shares;
              const costBasis = position.avgCost * position.shares;
              return { ...position, lastPrice, marketValue, unrealizedPnl, unrealizedPct: costBasis ? unrealizedPnl / costBasis * 100 : 0 };
            }));
          };

          this.stockDataService.getPrices(symbols)
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: updatePrices, error: error => console.error('Error loading prices:', error) });

          interval(30000)
            .pipe(switchMap(() => this.stockDataService.getPrices(symbols)), takeUntil(this.destroy$))
            .subscribe({ next: updatePrices, error: (error: unknown) => console.error('Error polling prices:', error) });
        },
        error: error => console.error('Error loading holdings:', error),
      });
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.clientId = this.stockDataService.getOrCreateClientId();
    this.priceWebsocketService.getPriceUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => this.applyPriceUpdate(update));

  }

  onWatchlistSymbolsChange(symbols: string[]): void {
    const normalized = Array.from(new Set(symbols.map(symbol => symbol.toUpperCase())));

    this.stockDataService.syncWatchlist(this.clientId, normalized)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    const nextWatchlistSymbols = new Set(normalized);
    const symbolsToSubscribe = normalized.filter(symbol => !this.websocketSymbols.has(symbol));
    if (symbolsToSubscribe.length > 0) {
      this.priceWebsocketService.subscribe(symbolsToSubscribe);
    }
    symbolsToSubscribe.forEach(symbol => this.websocketSymbols.add(symbol));

    const symbolsToUnsubscribe = Array.from(this.subscribedWatchlistSymbols)
      .filter(symbol => !nextWatchlistSymbols.has(symbol) && !this.positionSymbols.has(symbol));
    if (symbolsToUnsubscribe.length > 0) {
      this.priceWebsocketService.unsubscribe(symbolsToUnsubscribe);
      symbolsToUnsubscribe.forEach(symbol => this.websocketSymbols.delete(symbol));
    }
    this.subscribedWatchlistSymbols = nextWatchlistSymbols;
  }

  ngOnDestroy(): void {
    this.priceWebsocketService.unsubscribe(Array.from(this.websocketSymbols));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyPriceUpdate(update: PriceUpdate): void {
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
    this.positions.update(positions => positions.map(position => {
      if (position.symbol.toUpperCase() !== ticker) {
        return position;
      }
      const lastPrice = Number(price.currentPrice ?? position.lastPrice);
      const marketValue = position.shares * lastPrice;
      const unrealizedPnl = (lastPrice - position.avgCost) * position.shares;
      const costBasis = position.avgCost * position.shares;
      return { ...position, lastPrice, marketValue, unrealizedPnl, unrealizedPct: costBasis ? unrealizedPnl / costBasis * 100 : 0 };
    }));
  }

  private getMarketClock(
    market: typeof MARKET_DEFINITIONS[number],
    now: Date,
  ): MarketClock {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: market.timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const hour = Number(values['hour']) % 24;
    const minute = Number(values['minute']);
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values['weekday']);
    const currentMinutes = hour * 60 + minute;
    const openMinutes = market.open[0] * 60 + market.open[1];
    const closeMinutes = market.close[0] * 60 + market.close[1];
    const isCrypto = market.code === '24/7';
    const isForex = market.code === 'FX';
    const isForexOpen = day === 0
      ? currentMinutes >= openMinutes
      : day >= 1 && day <= 4
        ? true
        : day === 5
          ? currentMinutes < openMinutes
          : false;
    const isOpen = isCrypto || (isForex
      ? isForexOpen
      : market.weekdays.includes(day as never) && currentMinutes >= openMinutes && currentMinutes < closeMinutes);

    return {
      name: market.name,
      code: market.code,
      timeZone: market.timeZone,
      hours: market.hours,
      time: this.formatTime(now, market.timeZone),
      status: isOpen ? 'OPEN' : 'CLOSED',
      isOpen,
    };
  }

  private formatTime(date: Date, timeZone: string, includeZone = false): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: includeZone ? 'short' : undefined,
    }).format(date);
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

  formatPnl(pnl: number, pct: number): string {
    const sign   = pnl >= 0 ? '+' : '';
    const absVal = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return `${sign}${absVal} (${sign}${pct.toFixed(2)}%)`;
  }

  rowBg(index: number): string {
    return index % 2 === 0 ? 'row-even' : 'row-odd';
  }
}
