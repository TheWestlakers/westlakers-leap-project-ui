import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap } from 'rxjs';

export interface TradingVolume {
  stagingId: number;
  orderId: number;
  orderStatusId: string | null;
  orderStatus: string | null;
  accountId: number;
  instrumentId: number;
  userId: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number | null;
  executedAt: string | null;
  accountType: string;
  firstName: string | null;
  lastName: string | null;
  instrumentCode: string;
  instrumentName: string;
  instrumentType: string;
  clientSegment: string | null;
  createdAt: string | null;
}

export interface TradingVolumePage {
  content: TradingVolume[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TradingVolumeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/trading-volumes';

  getTradingVolumes(page: number): Observable<TradingVolumePage> {
    const params = new HttpParams().set('page', page);
    return this.http.get<TradingVolumePage>(this.apiUrl, { params });
  }

  getAllTradingVolumes(): Observable<TradingVolume[]> {
    return this.getTradingVolumes(0).pipe(
      switchMap(firstPage => {
        const remainingPages = Array.from(
          { length: Math.max(firstPage.totalPages - 1, 0) },
          (_, index) => this.getTradingVolumes(index + 1),
        );

        return forkJoin(remainingPages).pipe(
          map(pages => [firstPage, ...pages]),
        );
      }),
      map(pages => pages.flatMap(page => page.content)),
    );
  }
}
