import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, finalize, map, of, shareReplay, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { Account, AccountService } from './account.service';

export const TOKEN_STORAGE_KEY = 'token';
export const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';

export enum Role {
  Admin = 1,
  User = 2,
}

export interface CurrentUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roleId: Role;
  accounts: Account[];
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  taxId: string | null;
  dateOfBirth: string;
  accountTypeId: number;
  settledCash: number;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly refreshBufferMs = 5_000;
  private readonly http = inject(HttpClient);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly inactivityMs = 60_000;
  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown'] as const;
  private readonly sessionEnded = new Subject<void>();
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private idleDeadline: number | undefined;
  private readonly onActivity = () => {
    if (this.idleDeadline === undefined) return;
    if (Date.now() >= this.idleDeadline) {
      this.expireIdleSession();
      return;
    }
    this.resetIdleTimer();
  };

  readonly currentUser = signal<CurrentUser | null>(null);
  readonly activeAccount = computed(() => this.currentUser()?.accounts[0] ?? null);
  readonly isAdmin = computed(() => this.currentUser()?.roleId === Role.Admin);
  /** Landing page for the signed-in user's role. */
  readonly homeUrl = computed(() => this.isAdmin() ? '/admin-dashboard' : '/portfolio');
  readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
  });
  readonly initials = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`;
    return (initials || user.email[0]).toUpperCase();
  });

  private refreshRequest: Observable<AuthTokens> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopIdleTracking();
      this.sessionEnded.next();
      this.sessionEnded.complete();
    });
    if (this.getToken() && this.getRefreshToken()) {
      this.startIdleTracking();
    }
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<AuthTokens>('/api/auth/login', { email, password }).pipe(
      tap(tokens => this.storeTokens(tokens)),
      tap(() => this.startIdleTracking()),
      switchMap(() => this.loadCurrentUser()),
    );
  }

  refresh(): Observable<AuthTokens> {
    if (this.idleDeadline !== undefined && Date.now() >= this.idleDeadline) {
      this.expireIdleSession();
      return throwError(() => new Error('Session expired due to inactivity'));
    }
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshRequest = this.http.post<AuthTokens>('/api/auth/refresh', { refreshToken }).pipe(
      takeUntil(this.sessionEnded),
      tap(tokens => this.storeTokens(tokens)),
      finalize(() => this.refreshRequest = undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshRequest;
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', request);
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/auth/me').pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  /** Resolves true when a valid session exists, loading the user from the stored token if needed. */
  ensureCurrentUser(): Observable<boolean> {
    if (this.currentUser()) return of(true);
    if (!this.getToken()) return of(false);

    return this.loadCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  logout(): void {
    this.stopIdleTracking();
    this.sessionEnded.next();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    this.currentUser.set(null);
    this.accountService.account.set(null);
  }

  getToken(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }

  getRefreshToken(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  private storeTokens(tokens: AuthTokens): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(TOKEN_STORAGE_KEY, tokens.token);
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
  }

  private startIdleTracking(): void {
    this.stopIdleTracking();
    if (!this.isBrowser) return;
    for (const event of this.activityEvents) {
      this.document.addEventListener(event, this.onActivity, { passive: true });
    }
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleDeadline = Date.now() + this.inactivityMs;
    this.idleTimer = setTimeout(() => this.expireIdleSession(), this.inactivityMs);
  }

  private stopIdleTracking(): void {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    this.idleDeadline = undefined;
    if (!this.isBrowser) return;
    for (const event of this.activityEvents) {
      this.document.removeEventListener(event, this.onActivity);
    }
  }

  private expireIdleSession(): void {
    this.logout();
    void this.router.navigate(['/login']);
  }

  needsTokenRefresh(): boolean {
    const token = this.getToken();
    const expiresAt = token ? this.getTokenExpiry(token) : null;
    return expiresAt !== null && expiresAt * 1000 - Date.now() <= this.refreshBufferMs;
  }

  private getTokenExpiry(token: string): number | null {
    if (typeof globalThis.atob !== 'function') {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      const encodedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const claims = JSON.parse(globalThis.atob(encodedPayload)) as { exp?: unknown };
      return typeof claims.exp === 'number' && Number.isFinite(claims.exp)
        ? claims.exp
        : null;
    } catch {
      return null;
    }
  }
}
