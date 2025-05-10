import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // Add RouterModule
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  fb = inject(FormBuilder);
  router = inject(Router);

  registerForm!: FormGroup;
  registerSubscription: Subscription | null = null;

  errorMessage = this.authService.authError;

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: [''], // Optional field
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      // confirmPassword: ['', Validators.required] // Add confirm password if needed
    }
    // Optional: Add custom validator for password match
    // { validators: this.passwordMatchValidator }
    );
    // Clear any previous auth errors
    this.authService.authError.set(null);
  }

  ngOnDestroy(): void {
    this.registerSubscription?.unsubscribe();
  }

  // Optional: Custom validator function
  // passwordMatchValidator(form: FormGroup) {
  //   const password = form.get('password');
  //   const confirmPassword = form.get('confirmPassword');
  //   return password && confirmPassword && password.value === confirmPassword.value
  //     ? null
  //     : { passwordMismatch: true };
  // }

  onSubmit(): void {
    if (this.registerForm.invalid) {
       this.registerForm.markAllAsTouched();
      return;
    }

    this.registerSubscription?.unsubscribe();

    // Exclude confirmPassword if it exists in the form group but not in DTO
    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.registerSubscription = this.authService.register(registerData).subscribe({
       // Navigation is handled within the authService on success
    });
  }

  // Getters for template
  get name() { return this.registerForm.get('name'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  // get confirmPassword() { return this.registerForm.get('confirmPassword'); }
}