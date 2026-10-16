import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

/** Date of birth must be a valid date before today */
function pastDateValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  const date = new Date(`${control.value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { invalidDate: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today ? null : { notInPast: true };
}

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
    private readonly auth = inject(AuthService);
    //private readonly router = inject(Router);

  protected readonly maxDateOfBirth = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
    dateOfBirth: ['', [Validators.required, pastDateValidator]],
    taxId: ['', [Validators.pattern(/^[0-9]{9}$/)]],
  });

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly registrationComplete = signal(false);

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
    const { firstName, lastName, email, password, phoneNumber, dateOfBirth, taxId } = this.form.getRawValue();
    this.auth.register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      phoneNumber,
      dateOfBirth,
      taxId: taxId || null,
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.registrationComplete.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        // 400s carry a user-facing message (e.g. duplicate email); anything else may contain internal details
        this.serverError.set(error.status === 400 && error.error?.message
          ? error.error.message
          : 'Unable to complete registration. Please check your details and try again.');
      },
    });
  }
}
