import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TopInvestor {
	investorId: number;
	firstName: string;
	lastName: string;
	clientSegment: string;
	totalTrades: number;
	totalVolume: number;
	totalValue: number;
}

export interface TopInstrument {
	instrumentId: number;
	instrumentCode: string;
	instrumentName: string;
	instrumentType: string;
	totalTrades: number;
	totalVolume: number;
	totalValue: number;
}

@Injectable({ providedIn: 'root' })
export class TopAnalyticsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = '/api/analytics';

	getTopInvestors(limit = 5): Observable<TopInvestor[]> {
		return this.http.get<TopInvestor[]>(`${this.apiUrl}/top-investors`, {
			params: new HttpParams().set('limit', limit),
		});
	}

	getTopInstruments(limit = 5): Observable<TopInstrument[]> {
		return this.http.get<TopInstrument[]>(`${this.apiUrl}/top-instruments`, {
			params: new HttpParams().set('limit', limit),
		});
	}
}
