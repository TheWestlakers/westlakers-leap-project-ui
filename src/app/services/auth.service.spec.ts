import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService JWT storage', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MapStorage(),
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

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

  it('refreshes proactively five seconds before the access token expires', () => {
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

    const request = http.expectOne('/api/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });
    request.flush({ token: 'new-token', refreshToken: 'new-refresh-token' });
    expect(service.getToken()).toBe('new-token');
  });

  it('clears both tokens on logout', () => {
    sessionStorage.setItem('token', 'access-token');
    sessionStorage.setItem('refreshToken', 'refresh-token');

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
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