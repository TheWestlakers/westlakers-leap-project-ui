import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';

@Component({
  imports: [RouterOutlet, CommonModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('paysprint');
  protected readonly themeService = inject(ThemeService);
}
