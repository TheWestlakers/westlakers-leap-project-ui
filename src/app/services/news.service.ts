import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface NewsArticle {
  sourceName: string | null;
  author: string | null;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
}

interface NewsResponse {
  totalResults?: number;
  articles?: NewsArticle[];
}

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  private readonly http = inject(HttpClient);

  getMarketNews(): Observable<NewsArticle[]> {
    return this.http.get<NewsResponse>('/api/news/market').pipe(
      map(response => response.articles ?? []),
    );
  }
}
