import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Instrument {
  instrumentId: number;
  marketId: number;
  assetClassId: number;
  ticker: string;
  name: string;
}

export interface MarketOrderRequest {
  accountId: number;
  instrumentId: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  estimatedPrice: number;
}

export interface LimitOrderRequest {
  accountId: number;
  instrumentId: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number;
}

export interface TradeExecutionRequest {
  executionPrice: number;
}

export interface TradeExecutionResponse {
  orderId: number;
  accountId: number;
  instrumentId: number;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  executionPrice: number | null;
  limitPrice?: number | null;
  totalValue: number | null;
  status: string;
  placedAt: string;
  executedAt: string | null;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getInstrumentByTicker(ticker: string): Observable<Instrument> {
    return this.http.get<Instrument[]>(`${this.apiUrl}/instruments`).pipe(
      map(instruments => {
        const instrument = instruments.find(
          candidate => candidate.ticker.toUpperCase() === ticker.toUpperCase()
        );

        if (!instrument) {
          throw new Error(`No instrument found for ${ticker}`);
        }

        return instrument;
      })
    );
  }

  searchInstruments(query: string): Observable<Instrument[]> {
    return this.http.get<Instrument[]>(`${this.apiUrl}/instruments/search`, {
      params: { q: query.trim() },
    });
  }

  createInstrument(instrument: Omit<Instrument, 'instrumentId'>): Observable<Instrument> {
    return this.http.post<Instrument>(`${this.apiUrl}/instruments`, instrument);
  }

  createMarketTrade(request: MarketOrderRequest): Observable<TradeExecutionResponse> {
    return this.http.post<TradeExecutionResponse>(`${this.apiUrl}/trades/market`, request);
  }

  createLimitTrade(request: LimitOrderRequest): Observable<TradeExecutionResponse> {
    return this.http.post<TradeExecutionResponse>(`${this.apiUrl}/trades/limit`, request);
  }

  executeTrade(orderId: number, executionPrice: number): Observable<TradeExecutionResponse> {
    return this.http.patch<TradeExecutionResponse>(
      `${this.apiUrl}/trades/${orderId}/execute`,
      { executionPrice } satisfies TradeExecutionRequest
    );
  }
}