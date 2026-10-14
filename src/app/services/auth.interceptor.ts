import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStorageKey = 'paysprint-access-token';
  const token = typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem(tokenStorageKey);
  const isBffApiRequest = request.url.startsWith('/api/');

  if (!token || !isBffApiRequest || request.url.endsWith('/api/auth/login')) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  }));
};