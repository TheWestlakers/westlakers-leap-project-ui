import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { NewsArticle, NewsService } from './services/news.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-news-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-feed.component.html',
  styleUrls: ['./news-feed.component.css'],
  host: { '[class.light-theme]': '!themeService.isDarkMode()' },
})
export class NewsFeedComponent implements OnInit {
  readonly skeletonCards = [1, 2, 3];
  readonly articles = signal<NewsArticle[]>([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  protected readonly themeService = inject(ThemeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly newsService = inject(NewsService);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading.set(false);
      return;
    }

    this.newsService.getMarketNews().subscribe({
      next: articles => {
        this.articles.set(articles);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('Error loading market news:', error);
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  trackArticle(index: number, article: NewsArticle): string {
    return article.url || `${index}-${article.title}`;
  }
}
