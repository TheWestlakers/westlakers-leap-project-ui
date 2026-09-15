import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Settings {
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  onLogout(): void {
    // TODO: wire real auth later
    this.router.navigateByUrl('/logout');
  }
}
