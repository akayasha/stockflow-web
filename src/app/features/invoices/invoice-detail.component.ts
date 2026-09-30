import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { parseApiError } from '../../core/http/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { Invoice } from './invoice.models';
import { InvoiceService } from './invoice.service';

type Action = 'issue' | 'pay' | 'cancel';

@Component({
  selector: 'app-invoice-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, StatusBadgeComponent],
  template: `
    <a routerLink="/invoices" class="text-sm font-medium text-slate-600 hover:text-brand-700 hover:underline">← Back to invoices</a>

    @if (loading()) {
      <p class="mt-4 text-slate-500">Loading…</p>
    } @else if (loadError()) {
      <div class="alert-error mt-4" role="alert">{{ loadError() }}</div>
    } @else if (invoice(); as inv) {
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-semibold text-slate-900">{{ inv.invoiceNumber }}</h1>
          <app-status-badge [status]="inv.status" />
        </div>

        <div class="flex gap-2">
          @if (inv.status === 'DRAFT' && auth.role() !== 'ADMIN') {
            <a
              [routerLink]="['/invoices', inv.id, 'edit']"
              class="btn-outline"
            >
              Edit items
            </a>
            <button
              type="button"
              class="btn-primary"
              [disabled]="acting() !== null"
              (click)="run('issue')"
            >
              {{ acting() === 'issue' ? 'Issuing…' : 'Issue' }}
            </button>
          }
          @if (inv.status === 'ISSUED' && auth.role() !== 'ADMIN') {
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
              [disabled]="acting() !== null"
              (click)="run('pay')"
            >
              {{ acting() === 'pay' ? 'Saving…' : 'Mark paid' }}
            </button>
          }
          @if ((inv.status === 'DRAFT' || inv.status === 'ISSUED') && auth.role() !== 'ADMIN') {
            <button
              type="button"
              class="btn-danger"
              [disabled]="acting() !== null"
              (click)="run('cancel')"
            >
              {{ acting() === 'cancel' ? 'Cancelling…' : 'Cancel invoice' }}
            </button>
          }
        </div>
      </div>

      @if (actionError()) {
        <div class="alert-error mt-4" role="alert">{{ actionError() }}</div>
      }

      <dl
        class="panel mt-4 grid gap-4 p-5 text-sm sm:grid-cols-3"
      >
        <div>
          <dt class="text-slate-500">Customer</dt>
          <dd class="font-medium">{{ inv.customerName }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Issue date</dt>
          <dd>{{ inv.issueDate | date: 'dd MMM yyyy' }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Due date</dt>
          <dd>{{ inv.dueDate ? (inv.dueDate | date: 'dd MMM yyyy') : '-' }}</dd>
        </div>
        @if (inv.notes) {
          <div class="sm:col-span-3">
            <dt class="text-slate-500">Notes</dt>
            <dd class="whitespace-pre-line">{{ inv.notes }}</dd>
          </div>
        }
      </dl>

      <div class="table-card mt-4 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="table-head">
            <tr>
              <th class="px-4 py-2 font-medium">Product</th>
              <th class="px-4 py-2 text-right font-medium">Unit price</th>
              <th class="px-4 py-2 text-right font-medium">Qty</th>
              <th class="px-4 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (item of inv.items; track $index) {
              <tr>
                <td class="px-4 py-2">{{ item.productName }}</td>
                <td class="px-4 py-2 text-right">
                  {{ item.unitPrice | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}
                </td>
                <td class="px-4 py-2 text-right">{{ item.quantity }}</td>
                <td class="px-4 py-2 text-right">
                  {{ item.lineTotal | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <dl class="ml-auto mt-4 max-w-xs space-y-1 text-sm">
        <div class="flex justify-between">
          <dt class="text-slate-600">Subtotal</dt>
          <dd>{{ inv.subtotal | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-600">Tax</dt>
          <dd>{{ inv.taxAmount | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
        </div>
        <div class="flex justify-between border-t pt-1 font-semibold">
          <dt>Total</dt>
          <dd>{{ inv.total | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
        </div>
      </dl>
    }
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private readonly api = inject(InvoiceService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  readonly invoice = signal<Invoice | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly acting = signal<Action | null>(null);
  readonly actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.get(this.id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(parseApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  run(action: Action): void {
    const inv = this.invoice();
    if (!inv) return;
    if (action === 'cancel') {
      const note = inv.status === 'ISSUED' ? ' Stock will be restored.' : '';
      if (!confirm(`Cancel invoice ${inv.invoiceNumber}?${note}`)) return;
    }

    this.acting.set(action);
    this.actionError.set(null);

    this.api[action](inv.id)
      .pipe(finalize(() => this.acting.set(null)))
      .subscribe({
        next: (updated) => this.invoice.set(updated),
        error: (err) => this.actionError.set(parseApiError(err).message),
      });
  }
}
