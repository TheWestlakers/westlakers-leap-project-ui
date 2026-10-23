import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatusName = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';

interface OrderResponse {
  orderId: number;
  accountId: number;
  instrumentId: number;
  side: OrderSide;
  orderType: OrderType;
  limitPrice: number | null;
  executionPrice: number | null;
  quantity: number;
  placedAt: string | null;
  executedAt: string | null;
  statusName: OrderStatusName;
  statusId: number;
}

interface InstrumentResponse {
  instrumentId: number;
  ticker: string;
  name: string;
}

export interface AccountOrder {
  orderId: number;
  instrumentId: number;
  symbol: string;
  name: string;
  side: OrderSide;
  orderType: OrderType;
  limitPrice: number | null;
  executionPrice: number | null;
  quantity: number;
  placedAt: Date | null;
  executedAt: Date | null;
  status: OrderStatusName;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  /** Orders placed by the given account, newest first, with instrument tickers resolved. */
  getOrdersByAccountId(accountId: number): Observable<AccountOrder[]> {
    return forkJoin({
      orders: this.http.get<OrderResponse[]>(`${this.apiUrl}/accounts/${accountId}/orders`),
      instruments: this.http.get<InstrumentResponse[]>(`${this.apiUrl}/instruments`),
    }).pipe(
      map(({ orders, instruments }) => {
        const instrumentsById = new Map(
          instruments.map(instrument => [instrument.instrumentId, instrument]),
        );

        return orders
          .map(order => {
            const instrument = instrumentsById.get(order.instrumentId);
            return {
              orderId: order.orderId,
              instrumentId: order.instrumentId,
              symbol: instrument?.ticker ?? `#${order.instrumentId}`,
              name: instrument?.name ?? '',
              side: order.side,
              orderType: order.orderType,
              limitPrice: order.limitPrice === null ? null : Number(order.limitPrice),
              executionPrice: order.executionPrice === null ? null : Number(order.executionPrice),
              quantity: Number(order.quantity),
              placedAt: order.placedAt ? new Date(order.placedAt) : null,
              executedAt: order.executedAt ? new Date(order.executedAt) : null,
              status: order.statusName,
            };
          })
          .sort((a, b) => (b.placedAt?.getTime() ?? 0) - (a.placedAt?.getTime() ?? 0));
      }),
    );
  }
}
