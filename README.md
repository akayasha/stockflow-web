# StockFlow Web

Angular frontend for the StockFlow inventory and invoicing take-home test.

## Prerequisites

- Node.js 22+
- Backend running at `http://localhost:8080`

The dev server uses `proxy.conf.json`, so browser requests to `/api` are
proxied to the Spring Boot backend.

## Setup and run

```bash
cd D:\works\stockflow-web
npm install
npm start
```

Open:

```text
http://localhost:4200
```

Build:

```bash
npm run build
```

## Demo credentials

Admin is seeded by the backend Flyway migration:

| Role | Email | Password |
|---|---|---|
| ADMIN | `demo@stockflow.dev` | `Demo1234!` |

Normal registration from the UI creates a `STAFF` account.

## Simple flow

1. Start backend first.
2. Start frontend with `npm start`.
3. Login as admin.
4. Check **Products**: seeded products are the shared catalog.
5. Register a new staff user.
6. Login as staff.
7. Staff can see shared admin products, but cannot edit/delete them.
8. Staff creates an invoice using shared products.
9. Staff issues the invoice; backend decrements stock.
10. Admin logs in again and can view all invoices.

## Use cases

| Actor | Use case |
|---|---|
| ADMIN | Login using the seeded admin account. |
| ADMIN | View and manage shared catalog products. |
| ADMIN | View all staff invoices. |
| STAFF | Register/login as a normal user. |
| STAFF | View shared admin catalog products. |
| STAFF | Create and manage own products. |
| STAFF | Create invoices from shared or own products. |
| STAFF | Edit DRAFT invoice line items. |
| STAFF | Issue, mark paid, or cancel own invoices. |

## Implemented screens

- Register
- Login/logout
- Product list/search/pagination
- Product create/edit/delete for own products
- Shared catalog product visibility for staff
- Invoice create
- Invoice list/filter/pagination
- Invoice detail
- DRAFT invoice line-item edit
- Issue / mark paid / cancel actions for staff-owned invoices

## Notes

- Product and invoice business rules are enforced by the backend.
- Frontend previews invoice totals, but final totals are calculated server-side.
- Staff cannot modify admin-owned shared catalog products from the UI.
- Admin can view all invoices; mutation actions are hidden in the UI to avoid
  changing another user's invoice by accident.
