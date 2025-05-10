import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Use the computed signal directly
  if (authService.isLoggedIn()) {
    return true; // Allow access if logged in
  } else {
    // Redirect to login page if not logged in
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};

// Optional: Inverse guard for login/register pages
export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true; // Allow access if NOT logged in
  } else {
    router.navigate(['/chat']); // Redirect to chat if already logged in
    return false;
  }
};
