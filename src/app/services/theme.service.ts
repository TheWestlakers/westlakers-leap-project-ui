import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkMode = signal<boolean>(this.loadThemePreference());
  readonly isPowerView = signal<boolean>(this.loadPowerViewPreference());
  readonly isLebronMode = signal<boolean>(this.loadLebronModePreference());

  private readonly document = inject(DOCUMENT);

  constructor() {
    // Lebron mode is applied globally via a class on <html> (see styles.css)
    effect(() => {
      this.document.documentElement.classList.toggle('lebron-mode', this.isLebronMode());
    });
    this.syncDocumentTheme();
  }

  toggleTheme(): void {
    this.setDarkMode(!this.isDarkMode());
  }

  setDarkMode(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    this.saveThemePreference(isDark);
    this.syncDocumentTheme();
    // Lebron mode is a dark-based palette, so switching to light turns it off
    if (!isDark && this.isLebronMode()) {
      this.setLebronMode(false);
    }
  }

  toggleLebronMode(): void {
    this.setLebronMode(!this.isLebronMode());
  }

  setLebronMode(isLebron: boolean): void {
    this.isLebronMode.set(isLebron);
    this.saveLebronModePreference(isLebron);
    if (isLebron && !this.isDarkMode()) {
      this.setDarkMode(true);
    }
  }

  togglePowerView(): void {
    const newValue = !this.isPowerView();
    this.isPowerView.set(newValue);
    this.savePowerViewPreference(newValue);
  }

  private loadThemePreference(): boolean {
    if (typeof window === 'undefined') {
      return true; // Default to dark mode on server
    }
    const stored = localStorage.getItem('paysprint-theme-dark');
    return stored === null ? true : stored === 'true'; // Default to dark mode
  }

  private saveThemePreference(isDark: boolean): void {
    if (typeof window === 'undefined') {
      return; // Can't save on server
    }
    localStorage.setItem('paysprint-theme-dark', isDark.toString());
  }

  private syncDocumentTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.classList.toggle('light-theme', !this.isDarkMode());
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

  private loadLebronModePreference(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return localStorage.getItem('paysprint-lebron-mode') === 'true';
  }

  private saveLebronModePreference(isLebron: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('paysprint-lebron-mode', isLebron.toString());
  }
}
