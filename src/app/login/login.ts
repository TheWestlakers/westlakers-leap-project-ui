import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected onSubmit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    //ADD A ROUTE TO THE LANDING PAGE
    //this.router.navigateByUrl('/dummy/dummy');
    this.router.navigateByUrl('/portfolio');

    // PLACEHOLDER for real auth setup (Nest + JWT).
    // Below is an example of generated login flow:
    // this.isSubmitting.set(true);
    // const { email, password } = this.form.getRawValue();
    // this.auth.login({ email, password }).subscribe({
    //   next: () => {
    //     this.isSubmitting.set(false);
    //     this.router.navigateByUrl('/');
    //   },
    //   error: () => {
    //     this.isSubmitting.set(false);
    //     this.serverError.set('Incorrect email or password. Please try again.');
    //   },
    // });
  }
}