import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDarkMode = signal(true);

  toggleTheme(): void {
    this.isDarkMode.update((value) => !value);
  }
}
