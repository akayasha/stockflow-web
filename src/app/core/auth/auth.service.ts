import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, tap } from 'rxjs';
import { API_URL } from '../http/api.config';
import { clearHttpCache } from '../http/cache.interceptor';
import { Credentials, RegisterResponse, Session } from './auth.models';

const STORAGE_KEY = 'stockflow.session';
const MAX_TIMEOUT = 2_147_483_647; // batas setTimeout (~24,8 hari)

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly session = signal<Session | null>(this.load());

  readonly email = computed(() => this.session()?.email ?? '');
  readonly userId = computed(() => this.session()?.userId ?? '');
  readonly role = computed(() => this.session()?.role ?? '');
  readonly token = computed(() => this.session()?.token ?? null);

  constructor() {
    this.scheduleExpiry(this.session());
    // Event ini hanya terpicu di tab LAIN saat localStorage berubah.
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) this.syncFromStorage();
    });
  }

  isLoggedIn(): boolean {
    const s = this.session();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  }

  register(body: Credentials) {
    return this.http.post<RegisterResponse>(`${API_URL}/auth/register`, body);
  }

  login(body: Credentials) {
    return this.http.post<Session>(`${API_URL}/auth/login`, body).pipe(tap((s) => this.save(s)));
  }

  /** Invalidate on the server, then always clear locally. */
  logout(): void {
    this.http
      .post(`${API_URL}/auth/logout`, null)
      .pipe(finalize(() => this.endSession()))
      .subscribe({ error: () => {} });
  }

  /** Called by the interceptor when the server says the session is invalid. */
  handleUnauthorized(): void {
    this.endSession(true);
  }

  private endSession(expired = false): void {
    const from = this.router.url;
    this.session.set(null);
    this.clearExpiryTimer();
    clearHttpCache();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    const onAuthPage = /^\/(login|register)/.test(from);
    this.router.navigate(['/login'], {
      queryParams: expired && !onAuthPage ? { expired: 1, returnUrl: from } : {},
    });
  }

  private save(s: Session): void {
    this.session.set(s);
    clearHttpCache(); // jangan sampai data user sebelumnya terbawa
    this.scheduleExpiry(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }

  private syncFromStorage(): void {
    const s = this.load();
    this.session.set(s);
    clearHttpCache();
    this.scheduleExpiry(s);
    if (!s) this.router.navigate(['/login']);
    else if (/^\/(login|register)/.test(this.router.url)) this.router.navigate(['/']);
  }

  private scheduleExpiry(s: Session | null): void {
    this.clearExpiryTimer();
    if (!s) return;
    const ms = new Date(s.expiresAt).getTime() - Date.now();
    this.expiryTimer = setTimeout(
      () => this.endSession(true),
      Math.min(Math.max(ms, 0), MAX_TIMEOUT),
    );
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }

  private load(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      if (new Date(s.expiresAt).getTime() > Date.now()) return s;
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch {
      return null;
    }
  }
}
