import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-20 border-b border-white/70 bg-white/75 shadow-sm shadow-slate-200/40 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a routerLink="/" class="flex items-center gap-2" (click)="menuOpen.set(false)">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-600/20"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 8l-9-5-9 5 9 5 9-5z" />
              <path d="M3 8v8l9 5 9-5V8" />
              <path d="M12 13v8" />
            </svg>
          </span>
          <span class="text-lg font-semibold tracking-tight text-slate-900"
            >Stock<span class="text-brand-600">Flow</span></span
          >
        </a>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
          @for (l of links; track l.path) {
            <a
              [routerLink]="l.path"
              routerLinkActive="bg-brand-50! text-brand-700! font-medium"
              class="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >{{ l.label }}</a
            >
          }
        </nav>

        <div class="hidden items-center gap-3 md:flex">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
            aria-hidden="true"
          >
            {{ auth.email().charAt(0).toUpperCase() }}
          </span>
          <span class="max-w-40 truncate text-sm text-slate-600">{{ auth.email() }}</span>
          <button type="button" class="btn-outline" (click)="logout()">Logout</button>
        </div>

        <button
          type="button"
          class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
          aria-controls="mobile-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
        >
          @if (menuOpen()) {
            <svg
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          } @else {
            <svg
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          }
        </button>
      </div>

      @if (menuOpen()) {
        <div id="mobile-menu" class="border-t border-slate-200/70 bg-white/95 px-4 py-3 md:hidden">
          <nav class="flex flex-col gap-1" aria-label="Mobile">
            @for (l of links; track l.path) {
              <a
                [routerLink]="l.path"
                routerLinkActive="bg-brand-50! text-brand-700! font-medium"
                class="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                (click)="menuOpen.set(false)"
                >{{ l.label }}</a
              >
            }
          </nav>
          <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
                aria-hidden="true"
              >
                {{ auth.email().charAt(0).toUpperCase() }}
              </span>
              <span class="truncate text-sm text-slate-600">{{ auth.email() }}</span>
            </div>
            <button type="button" class="btn-outline shrink-0" (click)="logout()">Logout</button>
          </div>
        </div>
      }
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <router-outlet />
    </main>
  `,
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);

  readonly links = [
    { path: '/products', label: 'Products' },
    { path: '/invoices', label: 'Invoices' },
  ];

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
