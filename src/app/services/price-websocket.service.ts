import { Injectable, signal } from '@angular/core';
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
  private ws!: WebSocket;
  private priceUpdates$ = new Subject<PriceUpdate>();
  private connectionStatus = signal('disconnected');
  private subscribedTickers = new Set<string>();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8081/ws/prices');
      
      this.ws.onopen = () => {
        this.connectionStatus.set('connected');
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PriceUpdate;
          this.priceUpdates$.next(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = (event) => {
        this.connectionStatus.set('error');
        console.error('WebSocket error:', event);
      };

      this.ws.onclose = () => {
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
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        tickers: tickers
      }));
      tickers.forEach(t => this.subscribedTickers.add(t));
    }
    return this.priceUpdates$.asObservable();
  }

  unsubscribe(tickers: string[]) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        tickers: tickers
      }));
      tickers.forEach(t => this.subscribedTickers.delete(t));
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
