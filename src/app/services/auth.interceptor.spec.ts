import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
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

  afterEach(() => {
    TestBed.inject(AuthService).logout();
    http.verify();
    vi.useRealTimers();
  });

  function jwt(secondsRemaining: number): string {
    return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsRemaining }))}.signature`;
  }

  it('active protected requests share an on-demand refresh before being sent', async () => {
    vi.useFakeTimers();
    const client = TestBed.inject(HttpClient);
    const login = firstValueFrom(TestBed.inject(AuthService).login('user@example.com', 'password'));
    http.expectOne('/api/auth/login').flush({ token: jwt(60), refreshToken: 'refresh-token' });
    http.expectOne('/api/auth/me').flush({ roleId: 2, accounts: [] });
    await login;

    vi.advanceTimersByTime(55_000);
    http.expectNone('/api/auth/refresh');
    TestBed.inject(DOCUMENT).dispatchEvent(new Event('keydown'));
    const first = firstValueFrom(client.get('/api/accounts/1'));
    const second = firstValueFrom(client.get('/api/instruments'));
    http.expectNone('/api/accounts/1');
    http.expectNone('/api/instruments');
    const refresh = http.expectOne('/api/auth/refresh');
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-token' });
    const newToken = jwt(60);
    refresh.flush({ token: newToken, refreshToken: 'refresh-token' });
    for (const url of ['/api/accounts/1', '/api/instruments']) {
      const request = http.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
      request.flush({});
    }
    await expect(Promise.all([first, second])).resolves.toEqual([{}, {}]);
  });

  it('a request-triggered refresh does not extend the idle deadline', async () => {
    vi.useFakeTimers();
    const client = TestBed.inject(HttpClient);
    const login = firstValueFrom(TestBed.inject(AuthService).login('user@example.com', 'password'));
    http.expectOne('/api/auth/login').flush({ token: jwt(60), refreshToken: 'refresh-token' });
    http.expectOne('/api/auth/me').flush({ roleId: 2, accounts: [] });
    await login;
    vi.advanceTimersByTime(55_000);
    const response = firstValueFrom(client.get('/api/instruments'));
    http.expectOne('/api/auth/refresh').flush({ token: jwt(60), refreshToken: 'refresh-token' });
    http.expectOne('/api/instruments').flush({});
    await response;
    vi.advanceTimersByTime(5_000);
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not loop if the retry returns 401 again', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/instruments'));
    const rejected = expect(response).rejects.toMatchObject({ status: 401 });
    http.expectOne('/api/instruments').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush({ token: 'new-token', refreshToken: 'refresh-token' });
    http.expectOne('/api/instruments').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectNone('/api/auth/refresh');
    await rejected;
  });

  it('clears tokens and redirects when an on-demand refresh fails', async () => {
    sessionStorage.setItem('token', jwt(-10));
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/instruments'));
    const rejected = expect(response).rejects.toMatchObject({ status: 401 });
    http.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    await rejected;
    http.expectNone('/api/instruments');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/portfolio' } });
  });

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