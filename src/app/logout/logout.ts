import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-logout',
  imports: [RouterLink, CommonModule],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Logout {
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected signInAgain(): void {
    this.router.navigateByUrl('/login');
  }
}
