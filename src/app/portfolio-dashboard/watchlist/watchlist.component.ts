import { Component, signal, input, output, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  private readonly platformId = inject(PLATFORM_ID);

  /* ── Inputs ── */
  accountId = input<number | null>(null);
  allPrices = input<{ [symbol: string]: StockPrice }>({});
  isSelectable = input(true); // When false, items can't be clicked to select
  highlightFirstItem = input(true);
  showPricePlaceholder = input(false);
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
    this.restoreWatchlist();
    this.emitWatchlistSymbols();
  }

  /* ── Get live price or fallback to static price ── */
  getPrice(symbol: string): string {
    const livePrice = this.getLivePrice(symbol);
    if (livePrice) {
      return Number(livePrice.currentPrice).toFixed(2);
    }
    if (this.showPricePlaceholder()) {
      return '--';
    }
    const item = this.watchlist().find(w => w.symbol === symbol);
    return item ? item.price.toFixed(2) : '—';
  }

  private getLivePrice(symbol: string): StockPrice | null {
    const prices = this.allPrices();
    const normalizedSymbol = symbol.toUpperCase();
    const directPrice = prices[normalizedSymbol] ?? prices[symbol];
    if (directPrice) {
      return directPrice;
    }

    return Object.values(prices).find(price =>
      (price.symbol || price.ticker || '').toUpperCase() === normalizedSymbol
    ) ?? null;
  }

  /* ── Watchlist actions ── */
  toggleWatchlistEdit(): void {
    this.isEditingWatchlist.update(v => !v);
  }

  removeWatchlistItem(symbol: string): void {
    this.watchlist.update(list => list.filter(i => i.symbol !== symbol));
    this.persistWatchlist();
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
    this.persistWatchlist();
    this.emitWatchlistSymbols();
    this.newSymbol = '';
    this.newName   = '';
  }

  onItemClick(symbol: string): void {
    if (!this.isSelectable()) return;
    this.tickerSelected.emit(symbol);
  }

  private emitWatchlistSymbols(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.watchlistSymbolsChange.emit(this.watchlist().map(item => item.symbol));
  }

  private persistWatchlist(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.getWatchlistStorageKey(), JSON.stringify(this.watchlist()));
  }

  private restoreWatchlist(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const raw = localStorage.getItem(this.getWatchlistStorageKey());
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as WatchlistItem[];
      if (!Array.isArray(parsed)) {
        return;
      }

      const valid = parsed.filter(item => !!item?.symbol)
        .map(item => ({ ...item, symbol: item.symbol.toUpperCase() }));

      if (valid.length > 0) {
        this.watchlist.set(valid);
      }
    } catch {
      // Ignore malformed local storage and continue with defaults.
    }
  }

  private getWatchlistStorageKey(): string {
    return `wl.watchlist.items.account.${this.accountId() ?? 'anonymous'}`;
  }
}
