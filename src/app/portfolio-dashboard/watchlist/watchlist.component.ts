import { Component, signal, input, output, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchlistItem, SPARKLINE_PATHS, INITIAL_WATCHLIST } from '../portfolio-dashboard.component';
import { StockDataService, StockPrice } from '../../services/stock-data.service';
import { Instrument, TradeService } from '../../services/trade.service';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly stockDataService = inject(StockDataService);
  private readonly tradeService = inject(TradeService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchQuery$ = new Subject<string>();

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
  watchlist = signal<WatchlistItem[]>([]);
  isEditingWatchlist = signal(false);
  newSymbol = '';
  newName   = '';
  searchResults: Instrument[] = [];
  isSearching = false;
  selectedInstrument: Instrument | null = null;
  readonly sparklinePaths = SPARKLINE_PATHS;

  ngOnInit(): void {
    this.searchQuery$
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query) {
            this.isSearching = false;
            return of([] as Instrument[]);
          }
          this.isSearching = true;
          return this.tradeService.searchInstruments(query).pipe(
            catchError(() => of([] as Instrument[])),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((results) => {
        this.searchResults = results.slice(0, 7);
        this.isSearching = false;
      });

    if (!isPlatformBrowser(this.platformId) || this.accountId() === null) {
      return;
    }

    this.stockDataService.getAccountWatchlist(this.accountId()!)
      .subscribe(({ tickers }) => {
        const defaultsBySymbol = new Map(INITIAL_WATCHLIST.map(item => [item.symbol, item]));
        const items = tickers.map((symbol, index) => {
          const normalizedSymbol = symbol.toUpperCase();
          const existing = defaultsBySymbol.get(normalizedSymbol);
          return existing ?? {
            symbol: normalizedSymbol,
            name: normalizedSymbol,
            price: 0,
            change: 0,
            positive: true,
            sparkKey: (Object.keys(SPARKLINE_PATHS) as WatchlistItem['sparkKey'][])[index % Object.keys(SPARKLINE_PATHS).length],
          };
        });
        console.info(`Loaded ${items.length} watchlist ticker(s) from account_watchlist for account ${this.accountId()}`);
        this.watchlist.set(items);
        this.emitWatchlistSymbols();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.emitWatchlistSymbols();
  }

  addWatchlistItem(symbol?: string, name?: string): void {
    const sym = (symbol ?? this.selectedInstrument?.ticker ?? this.newSymbol).trim().toUpperCase();
    if (!sym || this.watchlist().some(item => item.symbol === sym)) return;
    const price   = Math.round((100 + Math.random() * 400) * 100) / 100;
    const change  = Math.round((Math.random() * 6 - 3) * 100) / 100;
    const keys    = Object.keys(SPARKLINE_PATHS) as WatchlistItem['sparkKey'][];
    const sparkKey = keys[Math.floor(Math.random() * keys.length)];
    this.watchlist.update(list => [
      ...list,
      { symbol: sym, name: name ?? this.selectedInstrument?.name ?? (this.newName.trim() || sym), price, change, positive: change >= 0, sparkKey },
    ]);
    this.emitWatchlistSymbols();
    this.newSymbol = '';
    this.newName   = '';
    this.selectedInstrument = null;
    this.searchResults = [];
  }

  onSearchValueChange(value: string): void {
    this.newSymbol = value;
    this.newName = '';
    this.selectedInstrument = null;
    this.searchQuery$.next(value.trim());
  }

  selectInstrument(instrument: Instrument): void {
    this.selectedInstrument = instrument;
    this.newSymbol = instrument.ticker;
    this.newName = instrument.name;
    this.searchResults = [];
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

}
