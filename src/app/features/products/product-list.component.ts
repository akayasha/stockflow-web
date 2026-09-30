import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { parseApiError } from '../../core/http/api-error';
import { PageResponse, Product } from './product.models';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <section class="page-shell">
      <div class="page-heading">
        <div>
          <h1 class="page-title">Products</h1>
          <p class="page-subtitle">
            Search inventory, maintain stock levels, and keep product pricing ready for invoices.
          </p>
        </div>
        <a routerLink="/products/new" class="btn-primary">New product</a>
      </div>

      <div class="panel p-4">
        <label class="label" for="product-search">Search inventory</label>
        <input
          id="product-search"
          type="search"
          [formControl]="search"
          placeholder="Search by product name or SKU"
          class="input max-w-md"
          aria-label="Search products"
        />
      </div>

    @if (error()) {
      <div class="alert-error mb-4" role="alert">{{ error() }}</div>
    }

    <div class="table-card overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="table-head">
          <tr>
            <th class="px-4 py-2 font-medium">SKU</th>
            <th class="px-4 py-2 font-medium">Name</th>
            <th class="px-4 py-2 text-right font-medium">Unit price</th>
            <th class="px-4 py-2 text-right font-medium">On hand</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @if (loading() && !data()) {
            <tr>
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">Loading…</td>
            </tr>
          } @else if (data()?.content?.length === 0) {
            <tr>
              <td colspan="5" class="px-4 py-6 text-center text-slate-500">No products found.</td>
            </tr>
          } @else {
            @for (p of data()?.content; track p.id) {
              <tr class="table-row" [class.opacity-60]="loading()">
                <td class="px-4 py-2 font-mono text-xs">{{ p.sku }}</td>
                <td class="px-4 py-2">{{ p.name }}</td>
                <td class="px-4 py-2 text-right">
                  {{ p.unitPrice | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}
                </td>
                <td class="px-4 py-2 text-right">{{ p.quantityOnHand }}</td>
                <td class="whitespace-nowrap px-4 py-2 text-right">
                  @if (canManage(p)) {
                    <a
                      [routerLink]="['/products', p.id, 'edit']"
                      class="text-indigo-600 hover:underline"
                      >Edit</a
                    >
                    <button
                      type="button"
                      class="ml-3 font-medium text-rose-600 hover:underline disabled:opacity-50"
                      [disabled]="deletingId() === p.id"
                      (click)="remove(p)"
                    >
                      {{ deletingId() === p.id ? 'Deleting…' : 'Delete' }}
                    </button>
                  } @else {
                    <span class="text-xs font-medium text-slate-400">Shared catalog</span>
                  }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (data(); as d) {
      <div class="flex items-center justify-between text-sm text-slate-600">
        <span
          >{{ d.totalElements }} product(s) · Page {{ page() + 1 }} of {{ d.totalPages || 1 }}</span
        >
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-outline"
            [disabled]="page() === 0 || loading()"
            (click)="goTo(page() - 1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="btn-outline"
            [disabled]="page() + 1 >= d.totalPages || loading()"
            (click)="goTo(page() + 1)"
          >
            Next
          </button>
        </div>
      </div>
    }
    </section>
  `,
})
export class ProductListComponent {
  private readonly api = inject(ProductService);
  readonly auth = inject(AuthService);
  private readonly reload$ = new Subject<void>();

  readonly search = new FormControl('', { nonNullable: true });
  readonly page = signal(0);
  readonly size = 20;

  readonly data = signal<PageResponse<Product> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  constructor() {
    merge(
      this.search.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.page.set(0)),
      ),
      this.reload$,
    )
      .pipe(
        startWith(null),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.list({ page: this.page(), size: this.size, q: this.search.value.trim() }).pipe(
            map((res) => ({ res, error: null as string | null })),
            catchError((err) => of({ res: null, error: parseApiError(err).message })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ res, error }) => {
        this.loading.set(false);
        if (error) this.error.set(error);
        else this.data.set(res);
      });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.reload$.next();
  }

  canManage(p: Product): boolean {
    return this.auth.role() === 'ADMIN' || p.ownerId === this.auth.userId();
  }

  remove(p: Product): void {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.deletingId.set(p.id);
    this.error.set(null);

    this.api
      .delete(p.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          if (this.data()?.content.length === 1 && this.page() > 0) this.page.update((v) => v - 1);
          this.reload$.next();
        },
        // termasuk 409 PRODUCT_REFERENCED: pesan dari server ditampilkan apa adanya
        error: (err) => this.error.set(parseApiError(err).message),
      });
  }
}
