import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Represents a stock price with OHLCV data and market information.
 */
export interface StockPrice {
  ticker: string;
  symbol: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bid: number;
  ask: number;
  change: number;
  changePct: number;
  changePercent?: number;
  marketCap?: number;
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  previousClose?: number;
  timestamp?: string;
  lastUpdate?: string;
}

/**
 * Service for fetching live stock price data from the backend.
 * Handles HTTP requests to the Price API and caches results.
 * 
 * Usage in components:
 *   constructor(private stockDataService: StockDataService) {}
 *   
 *   this.stockDataService.getPrice('AAPL').subscribe(price => {
 *     console.log(price.currentPrice);
 *   });
 *   
 *   this.stockDataService.getPrices(['AAPL', 'MSFT']).subscribe(prices => {
 *     console.log(prices); // { AAPL: {...}, MSFT: {...} }
 *   });
 */
@Injectable({
  providedIn: 'root',
})
export class StockDataService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = 'http://localhost:8081/api/prices';
  private readonly clientStorageKey = 'wl.client.id';
  
  // Cache for price data
  private priceCache = new Map<string, StockPrice>();
  private cacheDuration = 500; // Cache for 500 ms between live price requests
  private lastCacheTime = new Map<string, number>();
  
  // Observable subjects for real-time updates
  private priceUpdates$ = new BehaviorSubject<Map<string, StockPrice>>(new Map());

  /**
   * Get price for a single ticker symbol.
   * 
   * @param symbol Stock ticker symbol (e.g., "AAPL", "MSFT")
   * @returns Observable<StockPrice> with current price and market data
   */
  getPrice(symbol: string): Observable<StockPrice> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check cache
    if (this.isCacheValid(upperSymbol)) {
      return of(this.priceCache.get(upperSymbol)!);
    }

    return this.http.get<StockPrice>(
      `${this.apiUrl}/latest/${upperSymbol}`
    ).pipe(
      tap(price => {
        this.priceCache.set(upperSymbol, price);
        this.lastCacheTime.set(upperSymbol, Date.now());
      }),
      catchError(error => {
        console.error(`Error fetching price for ${upperSymbol}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get prices for multiple ticker symbols.
   * 
   * @param symbols Array of stock ticker symbols (e.g., ["AAPL", "MSFT", "GOOGL"])
   * @returns Observable<{[symbol: string]: StockPrice}> map of symbols to prices
   */
  getPrices(symbols: string[]): Observable<{ [symbol: string]: StockPrice }> {
    if (!symbols || symbols.length === 0) {
      return this.getAllPrices();
    }

    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    // Check which symbols are not cached
    const uncachedSymbols = upperSymbols.filter(
      symbol => !this.isCacheValid(symbol)
    );

    // If all symbols are cached, return them immediately
    if (uncachedSymbols.length === 0) {
      const cachedPrices: { [symbol: string]: StockPrice } = {};
      upperSymbols.forEach(symbol => {
        const price = this.priceCache.get(symbol);
        if (price) {
          cachedPrices[symbol] = price;
        }
      });
      return of(cachedPrices);
    }

    // Fetch uncached symbols
    let params = new HttpParams();
    uncachedSymbols.forEach(symbol => {
      params = params.append('symbols', symbol);
    });

    return this.http.get<{ prices: { [symbol: string]: StockPrice } }>(
      `${this.apiUrl}/all`,
      { params }
    ).pipe(
      map(response => response.prices || response as any),
      tap(prices => {
        // Update cache
        Object.entries(prices).forEach(([symbol, price]) => {
          this.priceCache.set(symbol, price as StockPrice);
          this.lastCacheTime.set(symbol, Date.now());
        });
        this.priceUpdates$.next(this.priceCache);
      }),
      catchError(error => {
        console.error('Error fetching prices:', error);
        throw error;
      })
    );
  }

  /**
   * Get all available ticker symbols and their prices.
   * 
   * @returns Observable<{[symbol: string]: StockPrice}> map of all cached prices
   */
  getAllPrices(): Observable<{ [symbol: string]: StockPrice }> {
    return this.http.get<{ [symbol: string]: StockPrice }>(
      `${this.apiUrl}/available`
    ).pipe(
      tap(prices => {
        Object.entries(prices).forEach(([symbol, price]) => {
          this.priceCache.set(symbol, price);
          this.lastCacheTime.set(symbol, Date.now());
        });
        this.priceUpdates$.next(this.priceCache);
      }),
      catchError(error => {
        console.error('Error fetching all prices:', error);
        // Return empty map if error
        return of({});
      })
    );
  }

  /**
   * Get cache statistics (available symbols, last update time).
   * 
   * @returns Observable with cache metadata
   */
  getCacheStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cache/stats`).pipe(
      catchError(error => {
        console.error('Error fetching cache stats:', error);
        throw error;
      })
    );
  }

  /**
   * Health check for the price API.
   * 
   * @returns Observable with API health status
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(error => {
        console.error('Price API health check failed:', error);
        throw error;
      })
    );
  }

  /**
   * Subscribe to real-time price updates.
   * Emits a map of all cached prices whenever cache is updated.
   * 
   * @returns Observable<Map<string, StockPrice>>
   */
  getPriceUpdates(): Observable<Map<string, StockPrice>> {
    return this.priceUpdates$.asObservable();
  }

  /**
   * Register a ticker so the backend streamer starts polling it.
   */
  registerTicker(symbol: string): Observable<{ tickers: string[]; count: number }> {
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) {
      return of({ tickers: [], count: 0 });
    }

    return this.http.post<{ tickers: string[]; count: number }>(
      `${this.apiUrl}/tickers/register`,
      { ticker }
    ).pipe(
      catchError(error => {
        console.error(`Error registering ticker ${ticker}:`, error);
        return of({ tickers: [], count: 0 });
      })
    );
  }

  /**
   * Register multiple tickers in one call.
   */
  registerTickers(symbols: string[]): Observable<{ tickers: string[]; count: number }> {
    const tickers = Array.from(new Set(
      (symbols || [])
        .map(symbol => symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => !!symbol)
    ));

    if (tickers.length === 0) {
      return of({ tickers: [], count: 0 });
    }

    return this.http.post<{ tickers: string[]; count: number }>(
      `${this.apiUrl}/tickers/register`,
      { tickers }
    ).pipe(
      catchError(error => {
        console.error('Error registering tickers:', error);
        return of({ tickers: [], count: 0 });
      })
    );
  }

  /**
   * Sync the full watchlist for a client so backend keeps persistent subscription ownership.
   */
  syncWatchlist(clientId: string, symbols: string[]): Observable<{ tickers: string[]; count: number }> {
    const tickers = Array.from(new Set(
      (symbols || [])
        .map(symbol => symbol?.trim().toUpperCase())
        .filter((symbol): symbol is string => !!symbol)
    ));

    return this.http.post<{ tickers: string[]; count: number }>(
      `${this.apiUrl}/tickers/watchlist/sync`,
      { clientId, tickers }
    ).pipe(
      catchError(error => {
        console.error('Error syncing watchlist:', error);
        return of({ tickers: [], count: 0 });
      })
    );
  }

  /**
   * Register a focused ticker for this specific frontend client.
   */
  focusTicker(clientId: string, symbol: string): Observable<{ ticker: string; status: string }> {
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) {
      return of({ ticker: '', status: 'ignored' });
    }

    return this.http.post<{ ticker: string; status: string }>(
      `${this.apiUrl}/tickers/focus`,
      { clientId, ticker }
    ).pipe(
      catchError(error => {
        console.error(`Error focusing ticker ${ticker}:`, error);
        return of({ ticker, status: 'error' });
      })
    );
  }

  /**
   * Release focused ticker ownership for this specific frontend client.
   */
  unfocusTicker(clientId: string, symbol: string): Observable<{ ticker: string; status: string }> {
    const ticker = symbol.trim().toUpperCase();
    if (!ticker) {
      return of({ ticker: '', status: 'ignored' });
    }

    return this.http.post<{ ticker: string; status: string }>(
      `${this.apiUrl}/tickers/unfocus`,
      { clientId, ticker }
    ).pipe(
      catchError(error => {
        console.error(`Error unfocusing ticker ${ticker}:`, error);
        return of({ ticker, status: 'error' });
      })
    );
  }

  /**
   * Get or create a stable per-browser client id used for ticker ownership.
   */
  getOrCreateClientId(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'server-render-client';
    }

    const existing = localStorage.getItem(this.clientStorageKey);
    if (existing) {
      return existing;
    }

    const generated = this.generateClientId();
    localStorage.setItem(this.clientStorageKey, generated);
    return generated;
  }

  /**
   * Clear the price cache.
   */
  clearCache(): void {
    this.priceCache.clear();
    this.lastCacheTime.clear();
  }

  /**
   * Invalidate cache for specific symbols to force refresh.
   * 
   * @param symbols Array of symbols to invalidate
   */
  invalidateCache(symbols: string[]): void {
    symbols.forEach(symbol => {
      this.priceCache.delete(symbol.toUpperCase());
      this.lastCacheTime.delete(symbol.toUpperCase());
    });
  }

  /**
   * Check if cached price is still valid (within cache duration).
   * 
   * @param symbol Stock ticker symbol
   * @returns true if cache is valid, false otherwise
   */
  private isCacheValid(symbol: string): boolean {
    const lastTime = this.lastCacheTime.get(symbol);
    if (!lastTime) {
      return false;
    }
    const elapsed = Date.now() - lastTime;
    return elapsed < this.cacheDuration && this.priceCache.has(symbol);
  }

  private generateClientId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `client-${crypto.randomUUID()}`;
    }

    const randomPart = Math.random().toString(36).slice(2, 12);
    return `client-${Date.now()}-${randomPart}`;
  }
}
