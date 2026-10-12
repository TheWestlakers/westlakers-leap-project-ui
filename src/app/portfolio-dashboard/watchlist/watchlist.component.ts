import { Component, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchlistItem, SPARKLINE_PATHS, INITIAL_WATCHLIST } from '../portfolio-dashboard.component';
import { StockPrice } from '../../services/stock-data.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent implements OnInit {
  /* ── Inputs ── */
  allPrices = input<{ [symbol: string]: StockPrice }>({});
  isSelectable = input(true); // When false, items can't be clicked to select
  selectedSymbol = input<string | null>(null);

  /* ── Outputs ── */
  tickerSelected = output<string>();
  watchlistSymbolsChange = output<string[]>();

  /* ── Watchlist state ── */
  watchlist = signal<WatchlistItem[]>(INITIAL_WATCHLIST);
  isEditingWatchlist = signal(false);
  newSymbol = '';
  newName   = '';
  readonly sparklinePaths = SPARKLINE_PATHS;

  ngOnInit(): void {
    this.emitWatchlistSymbols();
  }

  /* ── Get live price or fallback to static price ── */
  getPrice(symbol: string): string {
    const livePrice = this.allPrices()[symbol];
    if (livePrice) {
      return Number(livePrice.currentPrice).toFixed(2);
    }
    const item = this.watchlist().find(w => w.symbol === symbol);
    return item ? item.price.toFixed(2) : '—';
  }

  getChange(symbol: string): string {
    const livePrice = this.allPrices()[symbol];
    if (livePrice && livePrice.changePct) {
      return Number(livePrice.changePct).toFixed(2);
    }
    const item = this.watchlist().find(w => w.symbol === symbol);
    return item ? item.change.toFixed(2) : '0.00';
  }

  isPositive(symbol: string): boolean {
    const livePrice = this.allPrices()[symbol];
    if (livePrice && livePrice.changePct) {
      return Number(livePrice.changePct) >= 0;
    }
    const item = this.watchlist().find(w => w.symbol === symbol);
    return item ? item.positive : false;
  }

  /* ── Watchlist actions ── */
  toggleWatchlistEdit(): void {
    this.isEditingWatchlist.update(v => !v);
  }

  removeWatchlistItem(symbol: string): void {
    this.watchlist.update(list => list.filter(i => i.symbol !== symbol));
    this.emitWatchlistSymbols();
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
    this.emitWatchlistSymbols();
    this.newSymbol = '';
    this.newName   = '';
  }

  onItemClick(symbol: string): void {
    if (!this.isSelectable()) return;
    this.tickerSelected.emit(symbol);
  }

  private emitWatchlistSymbols(): void {
    this.watchlistSymbolsChange.emit(this.watchlist().map(item => item.symbol));
  }
}
