import { Component, computed, input } from '@angular/core';
import { InvoiceStatus } from '../features/invoices/invoice.models';

const STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 ring-blue-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

@Component({
  selector: 'app-status-badge',
  template: `<span
    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
    [class]="classes()"
    >{{ status() }}</span
  >`,
})
export class StatusBadgeComponent {
  readonly status = input.required<InvoiceStatus>();
  readonly classes = computed(() => STYLES[this.status()]);
}
