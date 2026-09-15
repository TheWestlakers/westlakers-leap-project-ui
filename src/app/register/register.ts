import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  host: { '[class.light-theme]': '!themeService.isDarkMode()' }
})
export class Register {
    private readonly fb = inject(FormBuilder);
    protected readonly themeService = inject(ThemeService);
    //private readonly router = inject(Router);

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
  }
}