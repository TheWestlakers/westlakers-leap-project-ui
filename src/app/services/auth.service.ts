import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { Account, AccountService } from './account.service';

export const TOKEN_STORAGE_KEY = 'token';

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

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private readonly proactiveRefreshDelay = 55_000;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshRequest: Observable<AuthTokens> | undefined;

  private readonly accountService = inject(AccountService);
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly activeAccount = computed(() => this.currentUser()?.accounts[0] ?? null);
  readonly isAdmin = computed(() => this.currentUser()?.roleId === Role.Admin);
  readonly homeUrl = computed(() => this.isAdmin() ? '/admin-dashboard' : '/portfolio');
  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : '';
  });
  readonly initials = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.email[0].toUpperCase();
  });

  constructor(private http: HttpClient, private router: Router) {
    if (this.getToken() && this.getRefreshToken()) {
      this.scheduleProactiveRefresh();
    }
  }

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<AuthTokens>('/api/auth/login', {
        email,
        password
    }).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      switchMap(() => this.loadCurrentUser()),
    );
  }

  refresh(): Observable<AuthTokens> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshRequest = this.http.post<AuthTokens>('/api/auth/refresh', { refreshToken }).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      finalize(() => this.refreshRequest = undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }

  register(email: string, password: string): Observable<unknown> {
    return this.http.post('/api/auth/register', {
      email,
      password
    });
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/auth/me').pipe(
      tap((user) => this.currentUser.set(user)),
    );
  }

  ensureCurrentUser(): Observable<boolean> {
    if (this.currentUser()) return of(true);
    if (!this.isAuthenticated()) return of(false);

    return this.loadCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.clearAuth();
        return of(false);
      }),
    );
  }

  getToken(): string | null {
    return this.getStoredValue('token');
  }

  getRefreshToken(): string | null {
    return this.getStoredValue('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getRefreshToken();
  }

  clearAuth(): void {
    this.clearRefreshTimer();

    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    this.currentUser.set(null);
    this.accountService.account.set(null);
  }

  logout(): void {
    this.clearAuth();
  }

  private storeTokens(tokens: AuthTokens): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem('token', tokens.token);
    sessionStorage.setItem('refreshToken', tokens.refreshToken);
    this.scheduleProactiveRefresh();
  }

  private scheduleProactiveRefresh(): void {
    this.clearRefreshTimer();
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      this.refresh().pipe(
        catchError((error: unknown) => {
          this.clearAuth();
          void this.router.navigateByUrl('/login');
          return EMPTY;
        }),
      ).subscribe();
    }, this.proactiveRefreshDelay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private getStoredValue(key: 'token' | 'refreshToken'): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
  }
}