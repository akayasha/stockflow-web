import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { applyFieldErrors, parseApiError } from '../../core/http/api-error';
import { ProductService } from './product.service';

type FieldName = 'sku' | 'name' | 'unitPrice' | 'quantityOnHand';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-2xl page-shell">
      <div>
        <h1 class="page-title">{{ isEdit ? 'Edit product' : 'New product' }}</h1>
        <p class="page-subtitle">
          Keep product identity, pricing, and available stock accurate for invoice creation.
        </p>
      </div>

      @if (error()) {
        <div class="alert-error mb-4" role="alert">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="text-slate-500">Loading…</p>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="panel space-y-5 p-5 sm:p-6"
          novalidate
        >
          <div>
            <label class="label" for="sku">SKU</label>
            <input id="sku" formControlName="sku" class="input" />
            @if (fieldError('sku'); as msg) {
              <p class="field-error">{{ msg }}</p>
            }
          </div>
          <div>
            <label class="label" for="name">Name</label>
            <input id="name" formControlName="name" class="input" />
            @if (fieldError('name'); as msg) {
              <p class="field-error">{{ msg }}</p>
            }
          </div>
          <div>
            <label class="label" for="description">Description (optional)</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              class="input"
            ></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label" for="unitPrice">Unit price</label>
              <input
                id="unitPrice"
                type="number"
                min="0"
                step="any"
                formControlName="unitPrice"
                class="input"
              />
              @if (fieldError('unitPrice'); as msg) {
                <p class="field-error">{{ msg }}</p>
              }
            </div>
            <div>
              <label class="label" for="quantityOnHand">Quantity on hand</label>
              <input
                id="quantityOnHand"
                type="number"
                min="0"
                step="1"
                formControlName="quantityOnHand"
                class="input"
              />
              @if (fieldError('quantityOnHand'); as msg) {
                <p class="field-error">{{ msg }}</p>
              }
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <a routerLink="/products" class="text-sm text-slate-600 hover:underline">Cancel</a>
            <button
              type="submit"
              class="btn-primary"
              [disabled]="saving()"
            >
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.id;

  readonly loading = signal(this.isEdit);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    sku: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    quantityOnHand: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    if (!this.id) return;
    this.api.get(this.id).subscribe({
      next: (p) => {
        this.form.patchValue({ ...p, description: p.description ?? '' });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(parseApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  fieldError(name: FieldName): string | null {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return null;
    if (c.errors?.['server']) return c.errors['server'];
    if (c.errors?.['required']) return 'This field is required.';
    if (c.errors?.['min']) return 'Must be 0 or more.';
    if (c.errors?.['pattern']) return 'Must be a whole number.';
    return 'Invalid value.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const body = { ...v, description: v.description.trim() || null };
    const request$ = this.id ? this.api.update(this.id, body) : this.api.create(body);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.router.navigate(['/products']),
      error: (err) => {
        const { message, fields } = parseApiError(err);
        if (!applyFieldErrors(this.form, fields)) this.error.set(message); // termasuk 409 SKU_TAKEN
      },
    });
  }
}
