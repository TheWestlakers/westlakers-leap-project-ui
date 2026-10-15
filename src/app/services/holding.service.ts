import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

interface HoldingResponse {
  holdingId: number;
  instrumentId: number;
  quantity: number;
  averagePrice: number;
}

interface InstrumentResponse {
  instrumentId: number;
  ticker: string;
  name: string;
}

export interface HoldingPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

@Injectable({
  providedIn: 'root',
})
export class HoldingService {
  private readonly http = inject(HttpClient);

  getHoldingsByAccountId(accountId: number): Observable<HoldingPosition[]> {
    return forkJoin({
      holdings: this.http.get<HoldingResponse[]>(`/api/accounts/${accountId}/holdings`),
      instruments: this.http.get<InstrumentResponse[]>('/api/instruments'),
    }).pipe(
      map(({ holdings, instruments }) => {
        const instrumentsById = new Map(
          instruments.map(instrument => [instrument.instrumentId, instrument]),
        );

        return holdings.flatMap(holding => {
          const instrument = instrumentsById.get(holding.instrumentId);
          return instrument
            ? [{
                id: String(holding.holdingId),
                symbol: instrument.ticker,
                name: instrument.name,
                shares: Number(holding.quantity),
                avgCost: Number(holding.averagePrice),
              }]
            : [];
        });
      }),
    );
  }
}
