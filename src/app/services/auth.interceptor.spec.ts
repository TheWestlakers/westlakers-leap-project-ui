import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let auth: AuthService;
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
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('token', 'expired-token');
    sessionStorage.setItem('refreshToken', 'refresh-token');
  });

  afterEach(() => http.verify());

  it('adds the access token, refreshes after a 401, and retries once', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/portfolio'));
    const initialRequest = http.expectOne('/api/portfolio');
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialRequest.flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = http.expectOne('/api/auth/refresh');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'refresh-token' });
    refreshRequest.flush({ token: 'new-token', refreshToken: 'new-refresh-token' });

    const retriedRequest = http.expectOne('/api/portfolio');
    expect(retriedRequest.request.headers.get('Authorization')).toBe('Bearer new-token');
    retriedRequest.flush({ ok: true });

    await expect(response).resolves.toEqual({ ok: true });
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears auth and redirects when refresh fails', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/portfolio'));
    http.expectOne('/api/portfolio').flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(auth.getToken()).toBeNull();
    expect(auth.getRefreshToken()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
    http.expectNone('/api/portfolio');
  });
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