import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopNavComponent } from '../top-nav.component';

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

/* ─── Seed data ───────────────────────────────────────── */
const ALL_POSITIONS: Position[] = [
  { id: '1', symbol: 'AAPL',  shares: 150, avgCost: 168.20, lastPrice: 182.52, marketValue:  27378.00, unrealizedPnl:  2148.00, unrealizedPct:   8.51, sector: 'Technology' },
  { id: '2', symbol: 'TSLA',  shares:  60, avgCost: 185.00, lastPrice: 176.54, marketValue:  10592.40, unrealizedPnl:  -507.60, unrealizedPct:  -4.57, sector: 'Consumer Discretionary' },
  { id: '3', symbol: 'AMZN',  shares:  80, avgCost: 155.40, lastPrice: 174.42, marketValue:  13953.60, unrealizedPnl:  1521.60, unrealizedPct:  12.24, sector: 'Consumer Discretionary' },
  { id: '4', symbol: 'NVDA',  shares:  45, avgCost: 420.00, lastPrice: 875.40, marketValue:  39393.00, unrealizedPnl: 20493.00, unrealizedPct: 108.57, sector: 'Technology' },
  { id: '5', symbol: 'MSFT',  shares:  30, avgCost: 310.50, lastPrice: 415.60, marketValue:  12468.00, unrealizedPnl:  3153.00, unrealizedPct:  33.82, sector: 'Technology' },
  { id: '6', symbol: 'META',  shares:  25, avgCost: 290.00, lastPrice: 485.20, marketValue:  12130.00, unrealizedPnl:  4880.00, unrealizedPct:  67.24, sector: 'Communication Services' },
];

@Component({
  selector: 'app-open-positions',
  standalone: true,
  imports: [CommonModule, RouterModule, TopNavComponent],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.css'],
})
export class OpenPositionsComponent {
  readonly Math = Math;
  /* ── Sort state ── */
  sortField = signal<SortField>('marketValue');
  sortDir   = signal<SortDir>('desc');

  /* ── Sorted positions ── */
  get positions(): Position[] {
    const field = this.sortField();
    const dir   = this.sortDir();
    return [...ALL_POSITIONS].sort((a, b) => {
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
    return ALL_POSITIONS.reduce((s, p) => s + p.marketValue, 0);
  }

  get totalUnrealizedPnl(): number {
    return ALL_POSITIONS.reduce((s, p) => s + p.unrealizedPnl, 0);
  }

  get totalUnrealizedPct(): number {
    const costBasis = this.totalMarketValue - this.totalUnrealizedPnl;
    return costBasis > 0 ? (this.totalUnrealizedPnl / costBasis) * 100 : 0;
  }

  get activeCount(): number { return ALL_POSITIONS.length; }

  get bestPerformer(): Position {
    return ALL_POSITIONS.reduce((best, p) =>
      p.unrealizedPct > best.unrealizedPct ? p : best, ALL_POSITIONS[0]
    );
  }

  get worstPerformer(): Position {
    return ALL_POSITIONS.reduce((worst, p) =>
      p.unrealizedPct < worst.unrealizedPct ? p : worst, ALL_POSITIONS[0]
    );
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
    const max = Math.max(...ALL_POSITIONS.map(p => p.marketValue));
    return (pos.marketValue / max) * 100;
  }
}
