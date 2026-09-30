  import { HttpClient, HttpParams } from '@angular/common/http';
  import { Injectable, inject } from '@angular/core';
  import { API_URL } from '../../core/http/api.config';
  import { PageResponse, Product, ProductRequest } from './product.models';

  @Injectable({ providedIn: 'root' })
  export class ProductService {
    private readonly http = inject(HttpClient);
    private readonly url = `${API_URL}/products`;

    list(opts: { page: number; size: number; q?: string }) {
      let params = new HttpParams().set('page', opts.page).set('size', opts.size);
      if (opts.q) params = params.set('q', opts.q);
      return this.http.get<PageResponse<Product>>(this.url, { params });
    }

    get(id: string) {
      return this.http.get<Product>(`${this.url}/${id}`);
    }

    create(body: ProductRequest) {
      return this.http.post<Product>(this.url, body);
    }

    update(id: string, body: ProductRequest) {
      return this.http.put<Product>(`${this.url}/${id}`, body);
    }

    delete(id: string) {
      return this.http.delete<void>(`${this.url}/${id}`);
    }
  }
