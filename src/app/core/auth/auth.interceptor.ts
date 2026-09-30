import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../http/api.config';
import { AuthService } from './auth.service';

const PUBLIC_URLS = [`${API_URL}/auth/login`, `${API_URL}/auth/register`];

/** 401 yang sebenarnya soal izin (role), bukan sesi. Sesi tetap valid. */
function isPermissionError(err: HttpErrorResponse): boolean {
  const message = String(err.error?.error?.message ?? err.error?.message ?? '');
  return err.status === 403 || /role|permission|forbidden/i.test(message);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(API_URL);
  const isPublic = PUBLIC_URLS.includes(req.url);
  const token = auth.token();

  const authReq =
    isApi && !isPublic && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApi && !isPublic && !isPermissionError(err)) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};
