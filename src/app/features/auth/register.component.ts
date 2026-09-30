import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { applyFieldErrors, parseApiError } from '../../core/http/api-error';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <div class="mb-6 text-center">
          <div
            class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white shadow-lg shadow-brand-600/25"
          >
            SF
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-950">Create your account</h1>
          <p class="mt-2 text-sm text-slate-500">
            Start with a secure login and a private inventory workspace.
          </p>
        </div>

        <div class="card p-6 sm:p-8">

        @if (error()) {
          <div class="alert-error mb-4" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <div>
            <label class="label" for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="input"
            />
            @if (email.touched && email.invalid) {
              <p class="field-error">
                @if (email.errors?.['server']) {
                  {{ email.errors?.['server'] }}
                } @else {
                  Enter a valid email address.
                }
              </p>
            }
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="input"
            />
            @if (password.touched && password.invalid) {
              <p class="field-error">
                @if (password.errors?.['server']) {
                  {{ password.errors?.['server'] }}
                } @else {
                  Password must be at least 8 characters.
                }
              </p>
            }
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Creating account…' : 'Register' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-slate-500">
          Already have an account?
          <a routerLink="/login" class="font-medium text-brand-700 hover:underline">Sign in</a>
        </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth
      .register(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/login'], { queryParams: { registered: 1 } }),
        error: (err) => {
          const { message, fields } = parseApiError(err);
          if (!applyFieldErrors(this.form, fields)) this.error.set(message);
        },
      });
  }
}
