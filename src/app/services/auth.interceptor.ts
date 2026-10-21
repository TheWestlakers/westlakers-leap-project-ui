import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const hasRetried = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isPublicAuthRequest = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
  ].some((url) => request.url.endsWith(url));
  const token = auth.getToken();
  const authenticatedRequest = !isPublicAuthRequest && token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (isPublicAuthRequest || !(error instanceof HttpErrorResponse) || error.status !== 401 || request.context.get(hasRetried)) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const refreshedToken = auth.getToken();
          if (!refreshedToken) return throwError(() => error);
          return next(request.clone({
            context: request.context.set(hasRetried, true),
            setHeaders: { Authorization: `Bearer ${refreshedToken}` },
          }));
        }),
        catchError((refreshError: unknown) => {
          auth.clearAuth();
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};