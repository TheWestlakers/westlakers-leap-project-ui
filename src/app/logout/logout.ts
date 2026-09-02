import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-logout',
  imports: [RouterLink],
  templateUrl: './logout.html',
  styleUrl: './logout.css',
})
export class Logout {
  private readonly router = inject(Router);

  protected signInAgain(): void {
    this.router.navigateByUrl('/login');
  }
}
