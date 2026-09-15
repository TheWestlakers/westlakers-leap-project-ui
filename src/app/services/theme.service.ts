import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkMode = signal<boolean>(true);

  toggleTheme(): void {
    this.isDarkMode.update((value) => !value);
  }

  setDarkMode(isDark: boolean): void {
    this.isDarkMode.set(isDark);
  }
}
