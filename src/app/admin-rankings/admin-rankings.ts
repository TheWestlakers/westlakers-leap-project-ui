import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ThemeService } from '../services/theme.service';

interface RankingEntry {
  name: string;
  value: number;
}

const allInvestors: RankingEntry[] = [
  { name: 'USR-4421', value: 211848 },
  { name: 'USR-8812', value: 91260 },
  { name: 'USR-9021', value: 78489 },
  { name: 'USR-2490', value: 64210.5 },
  { name: 'USR-8411', value: 52875.25 },
  { name: 'USR-1377', value: 49120 },
  { name: 'USR-6234', value: 44780.75 },
  { name: 'USR-5108', value: 39842.1 },
  { name: 'USR-7742', value: 36210 },
  { name: 'USR-3186', value: 31995.5 },
  { name: 'USR-6901', value: 28450 },
  { name: 'USR-2054', value: 25118.2 },
];

const allInstruments: RankingEntry[] = [
  { name: 'TSLA', value: 211848 },
  { name: 'AAPL', value: 91260 },
  { name: 'AMZN', value: 78489 },
  { name: 'NVDA', value: 66742.8 },
  { name: 'MSFT', value: 54318.4 },
  { name: 'GOOGL', value: 49880.25 },
  { name: 'META', value: 42115.6 },
  { name: 'AMD', value: 38942.1 },
  { name: 'NFLX', value: 31780 },
  { name: 'INTC', value: 26350.75 },
];

@Component({
  selector: 'app-admin-rankings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-rankings.html',
  styleUrl: './admin-rankings.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' },
})
export class AdminRankingsComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  readonly rankingType = this.route.snapshot.paramMap.get('rankingType') === 'instruments'
    ? 'instruments'
    : 'investors';
  readonly title = this.rankingType === 'instruments' ? 'ALL INSTRUMENTS' : 'ALL INVESTORS';
  readonly description = this.rankingType === 'instruments'
    ? 'All instruments ranked by current traded value'
    : 'All investors ranked by current order value';
  readonly columnLabel = this.rankingType === 'instruments' ? 'SYMBOL' : 'INVESTOR';
  readonly valueLabel = this.rankingType === 'instruments' ? 'TRADED VALUE' : 'ORDER VALUE';
  readonly entries = this.rankingType === 'instruments' ? allInstruments : allInvestors;

  goBack(): void {
    this.location.back();
  }
}