import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MapStorage(),
    });
    navigate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate, url: '/portfolio' } },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('token', 'access-token');
    sessionStorage.setItem('refreshToken', 'refresh-token');
  });

  afterEach(() => http.verify());

  it('does not attach the access token to auth endpoints', () => {
    const client = TestBed.inject(HttpClient);
    client.post('/api/auth/login', {}).subscribe();
    client.post('/api/auth/register', {}).subscribe();
    client.post('/api/auth/refresh', {}).subscribe();

    for (const url of ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']) {
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('refreshes once for simultaneous 401 responses and retries both requests', async () => {
    const client = TestBed.inject(HttpClient);
    const first = firstValueFrom(client.get('/api/accounts/1'));
    const second = firstValueFrom(client.get('/api/instruments'));

    http.expectOne('/api/accounts/1').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/instruments').flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshRequests = http.match('/api/auth/refresh');
    expect(refreshRequests).toHaveLength(1);
    refreshRequests[0].flush({ token: 'new-token', refreshToken: 'new-refresh-token' });

    const retriedAccount = http.expectOne('/api/accounts/1');
    const retriedInstruments = http.expectOne('/api/instruments');
    expect(retriedAccount.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retriedInstruments.request.headers.get('Authorization')).toBe('Bearer new-token');
    retriedAccount.flush({});
    retriedInstruments.flush({});

    await expect(Promise.all([first, second])).resolves.toEqual([{}, {}]);
  });

  it('clears tokens and preserves the current URL when refresh fails', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/accounts/1'));
    http.expectOne('/api/accounts/1').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/portfolio' } });
  });
});

class MapStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}