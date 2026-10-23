import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Landing {
  protected readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);

  // Session lives in sessionStorage, so it can only be checked once we're in the browser
  protected readonly isSignedIn = signal(false);

  protected readonly year = new Date().getFullYear();
  protected readonly imgLogo = '/assets/ed609.svg';

  protected readonly features: Feature[] = [
    {
      title: 'Live market pricing',
      description: 'Quotes stream in over a live connection, so prices and your portfolio value update as the market moves.',
      icon: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    },
    {
      title: 'Fast order entry',
      description: 'Search any symbol from the top bar and place buy or sell orders from the same screen you watch the chart on.',
      icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    },
    {
      title: 'Portfolio at a glance',
      description: 'Track net liquidity, open positions and performance in one dashboard built for active traders.',
      icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    },
    {
      title: 'Watchlists',
      description: 'Keep the instruments you care about one click away and jump straight to their chart and order ticket.',
      icon: 'M12 3l2.9 5.9 6.1.9-4.5 4.3 1 6.1L12 17.3 6.5 20.2l1-6.1L3 9.8l6.1-.9L12 3z',
    },
    {
      title: 'AI trading assistant',
      description: 'Ask general trading questions and get answers without leaving your dashboard.',
      icon: 'M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z',
    },
    {
      title: 'Complete order history',
      description: 'Every executed, pending and cancelled order is recorded so you can review exactly what happened and when.',
      icon: 'M12 7v5l3 3M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z',
    },
  ];

  protected readonly steps = [
    { title: 'Create your account', description: 'Choose an Individual, Health, Retirement or Corporate account and make an opening deposit.' },
    { title: 'Find an instrument', description: 'Search by symbol or company name, or pick one from your watchlist.' },
    { title: 'Place your trade', description: 'Review the quote, set your quantity and send the order.' },
  ];

  // Illustrative sparkline for the hero preview card (not live data)
  protected readonly previewLine = 'M0 70 L20 64 L40 68 L60 52 L80 56 L100 40 L120 46 L140 30 L160 34 L180 22 L200 26 L220 12 L240 16';

  constructor() {
    afterNextRender(() => this.isSignedIn.set(!!this.auth.getToken()));
  }

  protected dashboardUrl(): string {
    return this.auth.homeUrl();
  }
}
