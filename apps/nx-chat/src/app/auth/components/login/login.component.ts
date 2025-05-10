import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule for routerLink
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // Add RouterModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  fb = inject(FormBuilder);
  router = inject(Router);

  loginForm!: FormGroup;
  loginSubscription: Subscription | null = null;

  errorMessage = this.authService.authError;

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
     // Clear any previous auth errors when component loads
     this.authService.authError.set(null);
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
       this.loginForm.markAllAsTouched(); // Mark fields to show errors
      return;
    }

    // Unsubscribe from previous attempt if any
    this.loginSubscription?.unsubscribe();

    this.loginSubscription = this.authService.login(this.loginForm.value).subscribe({
      // Navigation is handled within the authService on success
      // Error handling is also done in authService, updating the signal
      // We don't need explicit success/error handlers here unless adding UI specifics
       complete: () => {
         // Optional: Code to run on completion (after success/error)
       }
    });
  }

  // Helper getters for template validation
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}