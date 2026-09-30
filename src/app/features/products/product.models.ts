export interface Product {
  id: string;
  ownerId: string;
  sku: string;
  name: string;
  description: string | null;
  unitPrice: number;
  quantityOnHand: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  sku: string;
  name: string;
  description: string | null;
  unitPrice: number;
  quantityOnHand: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
