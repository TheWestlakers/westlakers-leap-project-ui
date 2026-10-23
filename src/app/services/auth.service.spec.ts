import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService JWT storage', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MapStorage(),
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.logout();
    http.verify();
  });

  afterEach(() => vi.useRealTimers());

  it('stores both tokens returned by login before loading the current user', () => {
    service.login('user@example.com', 'password').subscribe();

    http.expectOne('/api/auth/login').flush({ token: 'access-token', refreshToken: 'refresh-token' });
    expect(service.getToken()).toBe('access-token');
    expect(service.getRefreshToken()).toBe('refresh-token');

    http.expectOne('/api/auth/me').flush({
      userId: 1,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleId: 2,
      accounts: [],
    });
  });

  it('sends only the refresh token and stores the rotated token pair', () => {
    sessionStorage.setItem('refreshToken', 'refresh-token');

    service.refresh().subscribe();
    const request = http.expectOne('/api/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });

    request.flush({ token: 'new-token', refreshToken: 'new-refresh-token' });
    expect(service.getToken()).toBe('new-token');
    expect(service.getRefreshToken()).toBe('new-refresh-token');
  });

  it('marks a near-expiry token for on-demand refresh without scheduling a request', () => {
    vi.useFakeTimers();
    const expiresAt = Math.floor(Date.now() / 1000) + 20;
    const token = `header.${btoa(JSON.stringify({ exp: expiresAt }))}.signature`;

    service.login('user@example.com', 'password').subscribe();
    http.expectOne('/api/auth/login').flush({ token, refreshToken: 'refresh-token' });
    http.expectOne('/api/auth/me').flush({
      userId: 1,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleId: 2,
      accounts: [],
    });

    vi.advanceTimersByTime(16_000);

    expect(service.needsTokenRefresh()).toBe(true);
    http.expectNone('/api/auth/refresh');
    expect(service.getToken()).toBe(token);
  });

  it('clears both tokens on logout', () => {
    sessionStorage.setItem('token', 'access-token');
    sessionStorage.setItem('refreshToken', 'refresh-token');

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });

  function loginSession(token = 'access-token'): void {
    service.login('user@example.com', 'password').subscribe();
    http.expectOne('/api/auth/login').flush({ token, refreshToken: 'refresh-token' });
    http.expectOne('/api/auth/me').flush({
      userId: 1, email: 'user@example.com', firstName: 'Test',
      lastName: 'User', roleId: 2, accounts: [],
    });
  }

  it('logs out and redirects after exactly 60 seconds without activity', () => {
    vi.useFakeTimers();
    loginSession();
    vi.advanceTimersByTime(59_999);
    expect(service.getToken()).toBe('access-token');
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it.each(['mousemove', 'mousedown', 'keydown'])('%s resets the inactivity timer', event => {
    vi.useFakeTimers();
    loginSession();
    vi.advanceTimersByTime(40_000);
    TestBed.inject(DOCUMENT).dispatchEvent(new Event(event));
    vi.advanceTimersByTime(59_999);
    expect(service.getToken()).toBe('access-token');
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it('API requests do not reset the inactivity timer', () => {
    vi.useFakeTimers();
    loginSession();
    vi.advanceTimersByTime(50_000);
    service.loadCurrentUser().subscribe();
    http.expectOne('/api/auth/me').flush({ roleId: 2, accounts: [] });
    vi.advanceTimersByTime(10_000);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });

  it('idle sessions never refresh and still expire at 60 seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    const jwt = () => `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 60 }))}.signature`;
    loginSession(jwt());
    vi.advanceTimersByTime(55_000);
    http.expectNone('/api/auth/refresh');
    expect(service.getToken()).not.toBeNull();
    vi.advanceTimersByTime(5_000);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
    vi.advanceTimersByTime(60_000);
    http.expectNone('/api/auth/refresh');
  });

  it('idle logout cancels an in-flight refresh so it cannot restore tokens', () => {
    vi.useFakeTimers();
    loginSession();
    vi.advanceTimersByTime(55_000);
    service.refresh().subscribe();
    const pendingRefresh = http.expectOne('/api/auth/refresh');
    vi.advanceTimersByTime(5_000);
    expect(pendingRefresh.cancelled).toBe(true);
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
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