import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';

export interface PriceUpdate {
  type: string;
  ticker?: string;
  data?: any;
  timestamp?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PriceWebsocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private ws?: WebSocket;
  private priceUpdates$ = new Subject<PriceUpdate>();
  private connectionStatus = signal('disconnected');
  private subscribedTickers = new Set<string>();

  constructor() {
    this.connect();
  }

  private connect() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const socket = new WebSocket('ws://localhost:8081/ws/prices');
      this.ws = socket;
      
      socket.onopen = () => {
        this.connectionStatus.set('connected');
        console.log('WebSocket connected');
        if (this.subscribedTickers.size > 0) {
          socket.send(JSON.stringify({
            action: 'subscribe',
            tickers: Array.from(this.subscribedTickers)
          }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PriceUpdate;
          this.priceUpdates$.next(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      socket.onerror = (event) => {
        this.connectionStatus.set('error');
        console.error('WebSocket error:', event);
      };

      socket.onclose = () => {
        this.connectionStatus.set('disconnected');
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };
    } catch (e) {
      console.error('Error connecting to WebSocket:', e);
    }
  }

  subscribe(tickers: string[]): Observable<PriceUpdate> {
    const normalizedTickers = tickers.map(ticker => ticker.toUpperCase());
    normalizedTickers.forEach(ticker => this.subscribedTickers.add(ticker));
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        tickers: normalizedTickers
      }));
    }
    return this.priceUpdates$.asObservable();
  }

  unsubscribe(tickers: string[]) {
    const normalizedTickers = tickers.map(ticker => ticker.toUpperCase());
    normalizedTickers.forEach(ticker => this.subscribedTickers.delete(ticker));
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        tickers: normalizedTickers
      }));
    }
  }

  getPriceUpdates(): Observable<PriceUpdate> {
    return this.priceUpdates$.asObservable();
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.connectionStatus() === 'connected';
  }
}
