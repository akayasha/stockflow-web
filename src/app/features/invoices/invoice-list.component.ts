import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, merge, of, startWith, switchMap, tap } from 'rxjs';
import { parseApiError } from '../../core/http/api-error';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { PageResponse } from '../products/product.models';
import { INVOICE_STATUSES, Invoice } from './invoice.models';
import { InvoiceService } from './invoice.service';

@Component({
  selector: 'app-invoice-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, StatusBadgeComponent],
  template: `
    <section class="page-shell">
      <div class="page-heading">
        <div>
          <h1 class="page-title">Invoices</h1>
          <p class="page-subtitle">
            Track draft, issued, paid, and cancelled invoices with server-calculated totals.
          </p>
        </div>
        <a routerLink="/invoices/new" class="btn-primary">New invoice</a>
      </div>

      <div class="panel max-w-xs p-4">
        <label class="label" for="status-filter">Status</label>
        <select id="status-filter" [formControl]="status" class="input" aria-label="Filter by status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
      </div>

    @if (error()) {
      <div class="alert-error mb-4" role="alert">{{ error() }}</div>
    }

    <div class="table-card overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="table-head">
          <tr>
            <th class="px-4 py-2 font-medium">Number</th>
            <th class="px-4 py-2 font-medium">Customer</th>
            <th class="px-4 py-2 font-medium">Issue date</th>
            <th class="px-4 py-2 font-medium">Due date</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @if (loading() && !data()) {
            <tr>
              <td colspan="6" class="px-4 py-6 text-center text-slate-500">Loading…</td>
            </tr>
          } @else if (data()?.content?.length === 0) {
            <tr>
              <td colspan="6" class="px-4 py-6 text-center text-slate-500">No invoices found.</td>
            </tr>
          } @else {
            @for (inv of data()?.content; track inv.id) {
              <tr class="table-row" [class.opacity-60]="loading()">
                <td class="px-4 py-2">
                  <a
                    [routerLink]="['/invoices', inv.id]"
                    class="font-semibold text-brand-700 hover:underline"
                    >{{ inv.invoiceNumber }}</a
                  >
                </td>
                <td class="px-4 py-2">{{ inv.customerName }}</td>
                <td class="px-4 py-2">{{ inv.issueDate | date: 'dd MMM yyyy' }}</td>
                <td class="px-4 py-2">
                  {{ inv.dueDate ? (inv.dueDate | date: 'dd MMM yyyy') : '-' }}
                </td>
                <td class="px-4 py-2"><app-status-badge [status]="inv.status" /></td>
                <td class="px-4 py-2 text-right">
                  {{ inv.total | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}
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
          >{{ d.totalElements }} invoice(s) · Page {{ page() + 1 }} of {{ d.totalPages || 1 }}</span
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
export class InvoiceListComponent {
  private readonly api = inject(InvoiceService);
  private readonly reload$ = new Subject<void>();

  readonly statuses = INVOICE_STATUSES;
  readonly status = new FormControl('', { nonNullable: true });
  readonly page = signal(0);
  readonly size = 20;

  readonly data = signal<PageResponse<Invoice> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    merge(this.status.valueChanges.pipe(tap(() => this.page.set(0))), this.reload$)
      .pipe(
        startWith(null),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.api.list({ page: this.page(), size: this.size, status: this.status.value }).pipe(
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
}
