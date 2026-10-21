import { HttpInterceptorFn } from '@angular/common/http';
import { TOKEN_STORAGE_KEY } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem(TOKEN_STORAGE_KEY);
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