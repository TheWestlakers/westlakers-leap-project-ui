import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-trade-here',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './trade-here.component.html',
  styleUrl: './trade-here.component.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class TradeHereComponent {
  protected readonly themeService = inject(ThemeService);
}
