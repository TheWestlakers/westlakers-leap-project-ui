import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkMode = signal<boolean>(this.loadThemePreference());
  readonly isPowerView = signal<boolean>(this.loadPowerViewPreference());

  toggleTheme(): void {
    const newValue = !this.isDarkMode();
    this.isDarkMode.set(newValue);
    this.saveThemePreference(newValue);
  }

  setDarkMode(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    this.saveThemePreference(isDark);
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
