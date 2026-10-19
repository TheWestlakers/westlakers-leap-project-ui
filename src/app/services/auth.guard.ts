import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  // Routes are prerendered on the server where there is no stored token; the browser re-checks on hydration.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const router = inject(Router);
  return inject(AuthService).ensureCurrentUser().pipe(
    map(isAuthenticated => isAuthenticated
      ? true
      : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
    ),
  );
};
