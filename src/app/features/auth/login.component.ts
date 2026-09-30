import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { parseApiError } from '../../core/http/api-error';

@Component({
  selector: 'app-login',
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
          <h1 class="text-2xl font-bold tracking-tight text-slate-950">Sign in to StockFlow</h1>
          <p class="mt-2 text-sm text-slate-500">
            Manage stock, invoices, and customer billing in one place.
          </p>
        </div>

        <div class="card p-6 sm:p-8">

        @if (justRegistered) {
          <div class="alert-success mb-4">Account created. Please sign in.</div>
        }
        @if (error()) {
          <div class="alert-error mb-4" role="alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" type="email" formControlName="email" autocomplete="email" class="input" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="field-error">Enter a valid email address.</p>
            }
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" class="input" />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="field-error">Password is required.</p>
            }
          </div>
          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-slate-500">
          No account?
          <a routerLink="/register" class="font-medium text-brand-700 hover:underline">Register</a>
        </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly justRegistered = this.route.snapshot.queryParamMap.has('registered');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/'),
        error: (err) => this.error.set(parseApiError(err).message),
      });
  }
}
