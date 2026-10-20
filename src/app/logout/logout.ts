import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-logout',
  imports: [RouterLink, CommonModule],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Logout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  constructor() {
    this.auth.clearAuth();
    void this.router.navigateByUrl('/login');
  }

  protected signInAgain(): void {
    this.auth.clearAuth();
    this.router.navigateByUrl('/login');
  }
}
