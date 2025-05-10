import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  LoginDto,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  User,
} from '@nx-chat/interfaces';
import { catchError, tap, throwError } from 'rxjs';

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private authToken = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.authToken());

  authError = signal<string | null>(null);

  // --- Effects ---
  private saveTokenEffect = effect(() => {
    const token = this.authToken();
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  });


  // --- Methods ---
  getToken(): string | null {
    return this.authToken();
  }

  login(credentials: LoginDto) {
    this.authError.set(null);
    return this.http.post<LoginResponse>('/api/auth/login', credentials).pipe(
      tap((response) => {
        this.authToken.set(response.accessToken);
        this.currentUser.set(response.user);
        this.router.navigate(['/chat']);
      }),
      catchError((error) => {
        this.authError.set(error?.error?.message || 'Login failed');
        console.error('Login error:', error);
        this.clearAuthData(); // Clear any partial state
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterDto) {
    this.authError.set(null);
    return this.http.post<RegisterResponse>('/api/auth/register', userData).pipe(
      tap((response) => {
        this.authToken.set(response.accessToken);
        localStorage.setItem('current_user', JSON.stringify(response.user));
        this.router.navigate(['/chat']);
      }),
      catchError((error) => {
        this.authError.set(error?.error?.message || 'Registration failed');
        console.error('Registration error:', error);
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  logout() {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  private clearAuthData() {
    this.authToken.set(null);
  }

  fetchCurrentUser$() {
    return this.http.get<User>('/api/users/me').pipe(
      tap((user) => {
        this.currentUser.set(user);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  fetchCurrentUser = toSignal(this.fetchCurrentUser$(), { initialValue: null });
}
