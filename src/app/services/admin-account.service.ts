import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account } from './account.service';

export interface AdminUser {
  userId: number;
  firstName: string;
  lastName: string;
  statusName: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/admin';

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`);
  }

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.apiUrl}/accounts`);
  }

  setTradingFrozen(accountId: number, frozen: boolean): Observable<Account> {
    const action = frozen ? 'freeze' : 'unfreeze';
    return this.http.patch<Account>(`${this.apiUrl}/accounts/${accountId}/${action}`, {});
  }
}
