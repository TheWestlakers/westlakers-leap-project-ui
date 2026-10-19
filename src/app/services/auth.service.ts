import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { Account, AccountService } from './account.service';

export const TOKEN_STORAGE_KEY = 'paysprint-access-token';

export interface CurrentUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  accounts: Account[];
}

interface LoginResponse {
  token: string;
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
  private readonly http = inject(HttpClient);
  private readonly accountService = inject(AccountService);

  readonly currentUser = signal<CurrentUser | null>(null);
  readonly activeAccount = computed(() => this.currentUser()?.accounts[0] ?? null);
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

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ token }) => this.setToken(token)),
      switchMap(() => this.loadCurrentUser()),
    );
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    this.currentUser.set(null);
    this.accountService.account.set(null);
  }

  private getToken(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private setToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }
}
