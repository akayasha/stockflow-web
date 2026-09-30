import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';
import { applyFieldErrors, parseApiError } from '../../core/http/api-error';
import { Product } from '../products/product.models';
import { ProductService } from '../products/product.service';
import { InvoiceItemRequest, InvoiceRequest } from './invoice.models';
import { InvoiceService } from './invoice.service';

/** Hanya untuk preview. Angka resmi dihitung server (tarif dari env backend). */
const TAX_PERCENT = 11;

/** Tanggal lokal YYYY-MM-DD (toISOString bisa bergeser sehari karena UTC). */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Due date tidak boleh sebelum issue date. Format YYYY-MM-DD bisa dibandingkan sebagai string. */
const dueDateNotBeforeIssueDate: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const issue = (group.get('issueDate')?.value as string) || today(); // kosong = server memakai hari ini
  const due = group.get('dueDate')?.value as string;
  return due && due < issue ? { dueBeforeIssue: true } : null;
};

@Component({
  selector: 'app-invoice-form',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="mx-auto max-w-4xl page-shell">
      <div>
        <h1 class="page-title">{{ isEdit ? 'Edit invoice items' : 'New invoice' }}</h1>
        <p class="page-subtitle">
          @if (isEdit) {
            Only DRAFT invoice line items can be edited. Customer and date fields are kept read-only.
          } @else {
            Build a draft invoice from existing products. Official totals and stock guards are enforced by the server.
          }
        </p>
      </div>

      @if (error()) {
        <div class="alert-error mb-4" role="alert">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="text-slate-500">Loading invoice form…</p>
      } @else if (products().length === 0) {
        <div class="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          You have no products yet.
          <a routerLink="/products/new" class="text-indigo-600 hover:underline">Create a product</a>
          first.
        </div>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="panel space-y-5 p-5 sm:p-6"
          novalidate
        >
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-3">
              <label class="label" for="customerName">Customer name</label>
              <input id="customerName" formControlName="customerName" class="input" [readonly]="isEdit" />
              @if (fieldError('customerName'); as msg) {
                <p class="field-error">{{ msg }}</p>
              }
            </div>
            <div>
              <label class="label" for="issueDate">Issue date</label>
              <input id="issueDate" type="date" formControlName="issueDate" class="input" [readonly]="isEdit" />
              @if (fieldError('issueDate'); as msg) {
                <p class="field-error">{{ msg }}</p>
              }
            </div>
            <div>
              <label class="label" for="dueDate">Due date</label>
              <input
                id="dueDate"
                type="date"
                formControlName="dueDate"
                class="input"
                [attr.min]="form.controls.issueDate.value || null"
                [readonly]="isEdit"
              />
              @if (dueDateError(); as msg) {
                <p class="field-error">{{ msg }}</p>
              }
            </div>
            <div class="sm:col-span-3">
              <label class="label" for="notes">Notes (optional)</label>
              <textarea id="notes" formControlName="notes" rows="2" class="input" [readonly]="isEdit"></textarea>
            </div>
          </div>

          <div>
            <h2 class="mb-2 text-sm font-medium text-slate-700">Line items</h2>
            <div formArrayName="items" class="space-y-3">
              @for (line of items.controls; track line; let i = $index) {
                <div [formGroupName]="i" class="grid grid-cols-12 items-start gap-2">
                  <div class="col-span-12 sm:col-span-7">
                    <select
                      formControlName="productId"
                      class="input"
                      [attr.aria-label]="'Product for line ' + (i + 1)"
                    >
                      <option value="" disabled>Select product…</option>
                      @for (p of products(); track p.id) {
                        <option [value]="p.id">
                          {{ p.sku }} — {{ p.name }} (stock {{ p.quantityOnHand }})
                        </option>
                      }
                    </select>
                  </div>
                  <div class="col-span-5 sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      formControlName="quantity"
                      class="input"
                      [attr.aria-label]="'Quantity for line ' + (i + 1)"
                    />
                  </div>
                  <div
                    class="col-span-5 self-center text-right text-sm text-slate-700 sm:col-span-2"
                  >
                    {{
                      (lines()[i]?.cents ?? 0) / 100 | currency: 'IDR' : 'symbol-narrow' : '1.0-2'
                    }}
                  </div>
                  <div class="col-span-2 text-right sm:col-span-1">
                    <button
                      type="button"
                      class="rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                      [disabled]="items.length === 1"
                      (click)="removeLine(i)"
                      [attr.aria-label]="'Remove line ' + (i + 1)"
                    >
                      ✕
                    </button>
                  </div>
                  @if (lineError(i); as msg) {
                    <p class="field-error col-span-12 -mt-1">{{ msg }}</p>
                  }
                  @if (stockWarning(i); as msg) {
                    <p class="col-span-12 -mt-1 text-xs text-amber-600">{{ msg }}</p>
                  }
                </div>
              }
            </div>
            <button
              type="button"
              class="mt-3 text-sm text-indigo-600 hover:underline"
              (click)="addLine()"
            >
              + Add line
            </button>
          </div>

          <dl class="ml-auto max-w-xs space-y-1 border-t pt-4 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-600">Subtotal (est.)</dt>
              <dd>{{ preview().subtotal / 100 | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-600">Tax {{ taxPercent }}% (est.)</dt>
              <dd>{{ preview().tax / 100 | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
            </div>
            <div class="flex justify-between font-semibold">
              <dt>Total (est.)</dt>
              <dd>{{ preview().total / 100 | currency: 'IDR' : 'symbol-narrow' : '1.0-2' }}</dd>
            </div>
            <p class="pt-1 text-xs text-slate-400">Final amounts are calculated by the server.</p>
          </dl>

          <div class="flex items-center justify-end gap-3">
            <a [routerLink]="cancelLink" class="text-sm text-slate-600 hover:underline">Cancel</a>
            <button
              type="submit"
              class="btn-primary"
              [disabled]="saving() || !canEdit()"
            >
              {{ saving() ? 'Saving…' : isEdit ? 'Save items' : 'Create draft' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class InvoiceFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly invoices = inject(InvoiceService);
  private readonly productApi = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly invoiceId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.invoiceId;
  readonly cancelLink = this.isEdit ? ['/invoices', this.invoiceId] : ['/invoices'];

  readonly taxPercent = TAX_PERCENT;

  readonly products = signal<Product[]>([]);
  readonly loadingProducts = signal(true);
  readonly loadingInvoice = signal(this.isEdit);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canEdit = signal(true);
  readonly loading = computed(() => this.loadingProducts() || this.loadingInvoice());

  readonly form = this.fb.group(
    {
      customerName: ['', [Validators.required]],
      issueDate: [today()],
      dueDate: [''],
      notes: [''],
      items: this.fb.array([this.newLine()]),
    },
    { validators: dueDateNotBeforeIssueDate },
  );

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  private readonly productMap = computed(() => new Map(this.products().map((p) => [p.id, p])));

  /** Per baris: produk terpilih, qty, dan total baris dalam sen (bilangan bulat). */
  readonly lines = computed(() =>
    this.formValue().items.map((it) => {
      const product = this.productMap().get(it.productId);
      const qty = Number(it.quantity) || 0;
      const cents = product ? Math.round(product.unitPrice * 100) * qty : 0;
      return { product, qty, cents };
    }),
  );

  readonly preview = computed(() => {
    const subtotal = this.lines().reduce((sum, l) => sum + l.cents, 0);
    const tax = Math.round((subtotal * TAX_PERCENT) / 100);
    return { subtotal, tax, total: subtotal + tax };
  });

  constructor() {
    // 100 produk pertama (urut nama). Cukup untuk demo; untuk data besar ganti dengan pencarian.
    this.productApi
      .list({ page: 0, size: 100 })
      .pipe(finalize(() => this.loadingProducts.set(false)))
      .subscribe({
        next: (res) => this.products.set(res.content),
        error: (err) => this.error.set(parseApiError(err).message),
      });

    if (this.invoiceId) {
      this.invoices
        .get(this.invoiceId)
        .pipe(finalize(() => this.loadingInvoice.set(false)))
        .subscribe({
          next: (invoice) => {
            if (invoice.status !== 'DRAFT') {
              this.canEdit.set(false);
              this.error.set('Only DRAFT invoices may have their line items edited.');
            }

            this.form.patchValue({
              customerName: invoice.customerName,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate ?? '',
              notes: invoice.notes ?? '',
            });
            this.replaceLines(invoice.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })));
          },
          error: (err) => {
            this.canEdit.set(false);
            this.error.set(parseApiError(err).message);
          },
        });
    }
  }

  get items() {
    return this.form.controls.items;
  }

  private newLine() {
    return this.fb.group({
      productId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    });
  }

  private replaceLines(lines: InvoiceItemRequest[]): void {
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }

    for (const line of lines.length ? lines : [{ productId: '', quantity: 1 }]) {
      const control = this.newLine();
      control.patchValue({
        productId: line.productId,
        quantity: line.quantity,
      });
      this.items.push(control);
    }
  }

  addLine(): void {
    this.items.push(this.newLine());
  }

  removeLine(i: number): void {
    if (this.items.length > 1) this.items.removeAt(i);
  }

  fieldError(name: 'customerName' | 'issueDate' | 'dueDate'): string | null {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return null;
    if (c.errors?.['server']) return c.errors['server'];
    if (c.errors?.['required']) return 'This field is required.';
    return 'Invalid value.';
  }

  dueDateError(): string | null {
    const due = this.form.controls.dueDate;
    if (this.form.hasError('dueBeforeIssue') && (due.touched || due.dirty)) {
      return 'Due date cannot be before the issue date.';
    }
    return this.fieldError('dueDate');
  }

  lineError(i: number): string | null {
    const g = this.items.at(i);
    if (g.controls.productId.touched && g.controls.productId.invalid) return 'Select a product.';
    if (g.controls.quantity.touched && g.controls.quantity.invalid)
      return 'Quantity must be a whole number, 1 or more.';
    return null;
  }

  /** Petunjuk saja; server yang memutuskan (stok diperiksa saat Issue). */
  stockWarning(i: number): string | null {
    const l = this.lines()[i];
    return l?.product && l.qty > l.product.quantityOnHand
      ? `Only ${l.product.quantityOnHand} in stock for ${l.product.name}.`
      : null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const items: InvoiceItemRequest[] = v.items.map((i) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
    }));
    const body: InvoiceRequest = {
      customerName: v.customerName.trim(),
      issueDate: v.issueDate || null,
      dueDate: v.dueDate || null,
      notes: v.notes.trim() || null,
      items,
    };

    const request$ = this.invoiceId
      ? this.invoices.replaceItems(this.invoiceId, items)
      : this.invoices.create(body);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (created) => this.router.navigate(['/invoices', created.id]),
        error: (err) => {
          const { message, fields } = parseApiError(err);
          if (!applyFieldErrors(this.form, fields)) this.error.set(message);
        },
      });
  }
}
