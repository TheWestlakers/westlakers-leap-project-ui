import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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

export interface RankingPage<T> {
	content: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
}

export function investorDisplayName(investor: TopInvestor): string {
	return `${investor.firstName ?? ''} ${investor.lastName ?? ''}`.trim() || String(investor.investorId);
}

export function instrumentDisplayName(instrument: TopInstrument): string {
	return instrument.instrumentCode || String(instrument.instrumentId);
}

@Injectable({ providedIn: 'root' })
export class TopAnalyticsService {
	private readonly http = inject(HttpClient);
	private readonly apiUrl = '/api/analytics';

	getTopInvestors(limit = 5): Observable<TopInvestor[]> {
		return this.getInvestorRankings(0, limit).pipe(map(result => result.content));
	}

	getTopInstruments(limit = 5): Observable<TopInstrument[]> {
		return this.getInstrumentRankings(0, limit).pipe(map(result => result.content));
	}

	getInvestorRankings(page = 0, size = 20): Observable<RankingPage<TopInvestor>> {
		return this.http.get<RankingPage<TopInvestor>>(`${this.apiUrl}/investor-rankings`, {
			params: new HttpParams().set('page', page).set('size', size),
		});
	}

	getInstrumentRankings(page = 0, size = 20): Observable<RankingPage<TopInstrument>> {
		return this.http.get<RankingPage<TopInstrument>>(`${this.apiUrl}/instrument-rankings`, {
			params: new HttpParams().set('page', page).set('size', size),
		});
	}
}
