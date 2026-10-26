import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, Role } from './auth.service';

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

/** Allows only signed-in users with the given role; anyone else is sent to their own role's home page. */
const roleGuard = (role: Role): CanActivateFn => (_route, state) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const router = inject(Router);
  const auth = inject(AuthService);
  return auth.ensureCurrentUser().pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }
      return auth.currentUser()?.roleId === role ? true : router.parseUrl(auth.homeUrl());
    }),
  );
};

export const adminGuard = roleGuard(Role.Admin);
export const analystGuard = roleGuard(Role.Analyst);
export const userGuard = roleGuard(Role.User);
