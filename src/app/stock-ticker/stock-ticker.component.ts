import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';
import { AiAssistantComponent } from '../portfolio-dashboard/ai-assistant/ai-assistant.component';
import { WatchlistItem, Position, OrderSide, OrderType, PortfolioRange, ChartPoint, SPARKLINE_PATHS, INITIAL_WATCHLIST } from '../portfolio-dashboard/portfolio-dashboard.component';

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
  imports: [CommonModule, FormsModule, RouterModule, TopNavComponent, AiAssistantComponent],
  templateUrl: './stock-ticker.component.html',
  styleUrls: ['./stock-ticker.component.css'],
})
export class StockTickerComponent implements OnInit {
  readonly Math = Math;

  /* ── Account ── */
  readonly totalAccountValue = 248512.90;
  readonly buyingPower       =  94210.45;
  readonly dayChange         =   3480.12;
  readonly dayChangePct      =      1.42;

  /* ── Stock symbol ── */
  readonly stockSymbol = 'AAPL';
  readonly stockName   = 'Apple Inc.';
  readonly stockPrice  = 182.52;

  /* ── Watchlist ── */
  watchlist = signal<WatchlistItem[]>(INITIAL_WATCHLIST);
  isEditingWatchlist = signal(false);
  newSymbol = '';
  newName   = '';

  /* ── Stock chart ── */
  readonly RANGES: PortfolioRange[] = ['1D', '5D', '1Y', '3Y', '5Y'];
  activeRange = signal<PortfolioRange>('5D');

  get rangeData(): RangeConfig {
    return RANGE_DATA[this.activeRange()];
  }

  get currentValue(): number { return this.stockPrice; }

  get isPositive(): boolean { return this.rangeData.deltaValue >= 0; }

  get chartColor(): string { return this.isPositive ? '#10b981' : '#ef4444'; }

  /* ── Order entry ── */
  orderSide      = signal<OrderSide>('BUY');
  orderType      = signal<OrderType>('LIMIT');
  orderSymbol    = signal(this.stockSymbol);
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

  ngOnInit(): void {}

  /* ── Watchlist actions ── */
  toggleWatchlistEdit(): void {
    this.isEditingWatchlist.update(v => !v);
  }

  removeWatchlistItem(symbol: string): void {
    this.watchlist.update(list => list.filter(i => i.symbol !== symbol));
  }

  addWatchlistItem(): void {
    const sym = this.newSymbol.trim().toUpperCase();
    if (!sym) return;
    const price   = Math.round((100 + Math.random() * 400) * 100) / 100;
    const change  = Math.round((Math.random() * 6 - 3) * 100) / 100;
    const keys    = Object.keys(SPARKLINE_PATHS) as WatchlistItem['sparkKey'][];
    const sparkKey = keys[Math.floor(Math.random() * keys.length)];
    this.watchlist.update(list => [
      ...list,
      { symbol: sym, name: this.newName.trim() || sym, price, change, positive: change >= 0, sparkKey },
    ]);
    this.newSymbol = '';
    this.newName   = '';
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
