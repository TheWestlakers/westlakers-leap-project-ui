import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly router = inject(Router);

  onLogout(): void {
    // TODO: wire real auth later
    this.router.navigateByUrl('/logout');
  }
}
