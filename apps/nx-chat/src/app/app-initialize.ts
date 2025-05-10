import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { inject } from '@angular/core';

export const initializeApp = () => {
  const authService = inject(AuthService);

  if (authService.isLoggedIn()) {
    return authService.fetchCurrentUser$().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          authService.logout();
        }
        return of(true);
      })
    );
  } else {
    return of(true);
  }
};
