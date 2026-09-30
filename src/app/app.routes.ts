import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/product-list.component').then((m) => m.ProductListComponent),
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/products/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/products/product-form.component').then((m) => m.ProductFormComponent),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./features/invoices/invoice-list.component').then((m) => m.InvoiceListComponent),
      },
      {
        path: 'invoices/new',
        loadComponent: () =>
          import('./features/invoices/invoice-form.component').then((m) => m.InvoiceFormComponent),
      },
      {
        path: 'invoices/:id/edit',
        loadComponent: () =>
          import('./features/invoices/invoice-form.component').then((m) => m.InvoiceFormComponent),
      },
      {
        path: 'invoices/:id',
        loadComponent: () =>
          import('./features/invoices/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
