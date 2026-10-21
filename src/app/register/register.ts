import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Register {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    protected readonly themeService = inject(ThemeService);
    private readonly auth = inject(AuthService);

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

    this.isSubmitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.register(email, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set('Registration failed. Please try again.');
      },
    });
  }
}