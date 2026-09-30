export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];

export interface InvoiceItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  notes: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  items: InvoiceItem[];
  createdAt?: string;
}

export interface InvoiceItemRequest {
  productId: string;
  quantity: number;
}

export interface InvoiceRequest {
  customerName: string;
  issueDate: string | null;
  dueDate: string | null;
  notes: string | null;
  items: InvoiceItemRequest[];
}
