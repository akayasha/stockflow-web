import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { API_URL } from './api.config';

/** Berapa lama respons GET dianggap segar. Ubah sesuai selera. */
const TTL_MS = 30_000;

const cache = new Map<string, { at: number; res: HttpResponse<unknown> }>();

export function clearHttpCache(): void {
  cache.clear();
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  // Aksi yang mengubah data: buang semua cache setelahnya.
  if (req.method !== 'GET') {
    return next(req).pipe(
      tap({
        next: (e) => e instanceof HttpResponse && cache.clear(),
        error: () => cache.clear(),
      }),
    );
  }

  const key = req.urlWithParams;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return of(hit.res.clone());

  return next(req).pipe(
    tap((e) => {
      if (e instanceof HttpResponse) cache.set(key, { at: Date.now(), res: e });
    }),
  );
};
