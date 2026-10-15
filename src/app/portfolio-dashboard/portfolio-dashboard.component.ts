import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from './ai-assistant/ai-assistant.component';
import { TradeHereComponent } from './trade-here/trade-here.component';
import { WatchlistComponent } from './watchlist/watchlist.component';
import { ThemeService } from '../services/theme.service';
import { AccountService } from '../services/account.service';
import { StockDataService, StockPrice } from '../services/stock-data.service';
import { HoldingService } from '../services/holding.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

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
export type PortfolioRange = '1D' | '5D' | '1Y' | '3Y' | '5Y';

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
  '1Y': buildRangeConfig(365, 198000, 248512.90, ['May',  'Jul',   'Sep',   'Nov',   'Jan'  ]),
  '3Y': buildRangeConfig(365 * 3, 142000, 248512.90, ['2022', '2023', '2024', 'Q1',  'Now' ]),
  '5Y': buildRangeConfig(365 * 5,  95000, 248512.90, ['2020', '2021', '2022', '2023', '2024']),
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
  private readonly stockDataService = inject(StockDataService);
  private readonly holdingService = inject(HoldingService);
  private readonly destroy$ = new Subject<void>();

  /* ── Account ── */
  readonly accountId = 3;
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;

  get totalAccountValue(): number { return Number(this.accountService.account()?.settledCash ?? 0); }
  get buyingPower(): number { return Number(this.accountService.account()?.settledCash ?? 0); }

  /* ── Stock prices ── */
  allPrices = signal<{ [symbol: string]: StockPrice }>({});

  /* ── Positions ── */
  readonly positions = signal<Position[]>([]);
  readonly COMPACT_LIMIT = 3;

  /* ── Portfolio chart ── */
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1Y', '3Y', '5Y'];
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

  ngOnInit(): void {
    this.accountService.loadAccount(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => console.error('Error loading account:', error)
      });

    this.holdingService.getHoldingsByAccountId(this.accountId)
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

          const updatePrices = (prices: { [symbol: string]: StockPrice }) => {
            this.allPrices.set(prices);
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

          interval(1000)
            .pipe(switchMap(() => this.stockDataService.getPrices(symbols)), takeUntil(this.destroy$))
            .subscribe({ next: updatePrices, error: error => console.error('Error polling prices:', error) });
        },
        error: error => console.error('Error loading holdings:', error),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
