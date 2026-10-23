import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light' | 'lakers';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<Theme>(this.loadThemePreference());
  // Lakers is a dark-based palette, so it counts as dark mode for component styling
  readonly isDarkMode = computed(() => this.theme() !== 'light');
  readonly isLebronMode = computed(() => this.theme() === 'lakers');
  readonly isPowerView = signal<boolean>(this.loadPowerViewPreference());

  private readonly document = inject(DOCUMENT);

  constructor() {
    // Theme classes are applied globally on <html> (see styles.css)
    effect(() => {
      const root = this.document.documentElement;
      root.classList.toggle('light-theme', !this.isDarkMode());
      root.classList.toggle('lebron-mode', this.isLebronMode());
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.saveThemePreference(theme);
  }

  togglePowerView(): void {
    const newValue = !this.isPowerView();
    this.isPowerView.set(newValue);
    this.savePowerViewPreference(newValue);
  }

  private loadThemePreference(): Theme {
    if (typeof window === 'undefined') {
      return 'dark'; // Default to dark mode on server
    }
    if (localStorage.getItem('paysprint-lebron-mode') === 'true') {
      return 'lakers';
    }
    return localStorage.getItem('paysprint-theme-dark') === 'false' ? 'light' : 'dark'; // Default to dark mode
  }

  private saveThemePreference(theme: Theme): void {
    if (typeof window === 'undefined') {
      return; // Can't save on server
    }
    localStorage.setItem('paysprint-theme-dark', (theme !== 'light').toString());
    localStorage.setItem('paysprint-lebron-mode', (theme === 'lakers').toString());
  }

  private loadPowerViewPreference(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = localStorage.getItem('paysprint-power-view');
    return stored === null ? true : stored === 'true';
  }

  private savePowerViewPreference(isPowerView: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('paysprint-power-view', isPowerView.toString());
  }
}
