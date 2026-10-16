import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Account {
  accountId: number;
  userId: number;
  accountTypeId: number;
  createdAt: string;
  settledCash: number;
  statusName: string;
  statusId: number;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  readonly account = signal<Account | null>(null);

  loadAccount(accountId: number): Observable<Account> {
    return this.http.get<Account>(`${this.apiUrl}/accounts/${accountId}`).pipe(
      tap(account => this.account.set(account))
    );
  }

  refreshAccount(accountId: number): Observable<Account> {
    return this.loadAccount(accountId);
  }
}
