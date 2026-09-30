import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../../core/http/api.config';
import { PageResponse } from '../products/product.models';
import { Invoice, InvoiceItemRequest, InvoiceRequest } from './invoice.models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/invoices`;

  list(opts: { page: number; size: number; status?: string }) {
    let params = new HttpParams().set('page', opts.page).set('size', opts.size);
    if (opts.status) params = params.set('status', opts.status);
    return this.http.get<PageResponse<Invoice>>(this.url, { params });
  }

  get(id: string) {
    return this.http.get<Invoice>(`${this.url}/${id}`);
  }

  create(body: InvoiceRequest) {
    return this.http.post<Invoice>(this.url, body);
  }

  replaceItems(id: string, items: InvoiceItemRequest[]) {
    return this.http.patch<Invoice>(`${this.url}/${id}/items`, items);
  }

  issue(id: string) {
    return this.http.post<Invoice>(`${this.url}/${id}/issue`, null);
  }

  pay(id: string) {
    return this.http.post<Invoice>(`${this.url}/${id}/pay`, null);
  }

  cancel(id: string) {
    return this.http.post<Invoice>(`${this.url}/${id}/cancel`, null);
  }
}
