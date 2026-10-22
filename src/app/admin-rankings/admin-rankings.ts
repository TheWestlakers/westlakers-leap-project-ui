import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, map } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import {
  RankingPage,
  TopAnalyticsService,
  instrumentDisplayName,
  investorDisplayName,
} from '../services/top-analytics.service';

interface RankingEntry {
  name: string;
  value: number;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-rankings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-rankings.html',
  styleUrl: './admin-rankings.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' },
})
export class AdminRankingsComponent implements OnInit {
  protected readonly themeService = inject(ThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly topAnalyticsService = inject(TopAnalyticsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private pageRequest?: Subscription;

  readonly rankingType = this.route.snapshot.paramMap.get('rankingType') === 'instruments'
    ? 'instruments'
    : 'investors';
  readonly title = this.rankingType === 'instruments' ? 'ALL INSTRUMENTS' : 'ALL INVESTORS';
  readonly description = this.rankingType === 'instruments'
    ? 'All instruments ranked by all-time traded value'
    : 'All investors ranked by all-time traded value';
  readonly columnLabel = this.rankingType === 'instruments' ? 'SYMBOL' : 'INVESTOR';
  readonly valueLabel = 'TRADED VALUE';
  readonly pageSize = PAGE_SIZE;

  readonly entries = signal<RankingEntry[]>([]);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.pageRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.pageRequest = this.fetchPage(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.entries.set(result.content);
          this.currentPage.set(result.page);
          this.totalPages.set(result.totalPages);
          this.totalElements.set(result.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.error.set(`Unable to load ${this.rankingType}. Please try again.`);
          this.loading.set(false);
        },
      });
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.loadPage(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.loadPage(this.currentPage() + 1);
    }
  }

  goBack(): void {
    this.location.back();
  }

  private fetchPage(page: number): Observable<RankingPage<RankingEntry>> {
    if (this.rankingType === 'instruments') {
      return this.topAnalyticsService.getInstrumentRankings(page, PAGE_SIZE).pipe(
        map(result => ({
          ...result,
          content: result.content.map(instrument => ({
            name: instrumentDisplayName(instrument),
            value: Number(instrument.totalValue),
          })),
        })),
      );
    }

    return this.topAnalyticsService.getInvestorRankings(page, PAGE_SIZE).pipe(
      map(result => ({
        ...result,
        content: result.content.map(investor => ({
          name: investorDisplayName(investor),
          value: Number(investor.totalValue),
        })),
      })),
    );
  }
}
