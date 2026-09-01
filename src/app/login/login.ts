import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
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
