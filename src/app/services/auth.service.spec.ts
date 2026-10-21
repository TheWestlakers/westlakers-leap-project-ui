import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MapStorage(),
    });
    navigateByUrl = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the access and refresh tokens returned by login', () => {
    service.login('user@example.com', 'password').subscribe();

    const request = http.expectOne('/api/auth/login');
    request.flush({ token: 'access-token', refreshToken: 'refresh-token' });

    const currentUserRequest = http.expectOne('/api/auth/me');
    currentUserRequest.flush({
      userId: 1,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleId: 2,
      accounts: [],
    });

    expect(service.getToken()).toBe('access-token');
    expect(service.getRefreshToken()).toBe('refresh-token');
    expect(service.currentUser()?.email).toBe('user@example.com');
  });

  it('refreshes proactively before the access token expires', () => {
    vi.useFakeTimers();
    service.login('user@example.com', 'password').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'access-token', refreshToken: 'refresh-token' });
    http.expectOne('/api/auth/me').flush({
      userId: 1,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleId: 2,
      accounts: [],
    });

    vi.advanceTimersByTime(55_000);

    const request = http.expectOne('/api/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-token' });
    request.flush({ token: 'new-access-token', refreshToken: 'new-refresh-token' });
    expect(service.getToken()).toBe('new-access-token');
    expect(navigateByUrl).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  afterEach(() => vi.useRealTimers());
});

class MapStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}