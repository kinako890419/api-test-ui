import { Component, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FailResponse, RegisterSuccess, RegisterRequest } from '../../models/auth.models';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  
  // Reactive state using signals
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  serverMessage = signal('');
  isSuccess = signal(false);
  
  form: FormGroup;
  private subscription?: Subscription;


  emailErrors = computed(() => {
    const control = this.form?.get('email');
    if (!control || !control.touched) return [];
    
    const errors = [];
    if (control.hasError('required')) errors.push('Email is required');
    if (control.hasError('email')) errors.push('Please enter a valid email address');
    
    return errors;
  });

  passwordErrors = computed(() => {
    const control = this.form?.get('password');
    if (!control || !control.touched) return [];
    
    const errors = [];
    if (control.hasError('required')) errors.push('Password is required');
    if (control.hasError('passwordStrength')) {
      const strength = control.getError('passwordStrength');
      if (!strength.hasMinLength) errors.push('At least 8 characters');
      if (!strength.hasUpperCase) errors.push('At least one uppercase letter');
      if (!strength.hasLowerCase) errors.push('At least one lowercase letter');
      if (!strength.hasNumber) errors.push('At least one number');
      if (!strength.hasSpecialChar) errors.push('At least one special character');
    }
    
    return errors;
  });

  confirmPasswordErrors = computed(() => {
    const control = this.form?.get('confirmPassword');
    if (!control || !control.touched) return [];
    
    const errors = [];
    if (control.hasError('required')) errors.push('Please confirm your password');
    if (control.hasError('passwordMismatch')) errors.push('Passwords do not match');
    
    return errors;
  });

  constructor() {
    this.form = this.fb.group({
      user_name: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(20)
      ]],
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.maxLength(50)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(3),
      ]],
    });

    // Watch password changes to revalidate confirm password
    this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  /**
   * Check if form is valid and ready for submission
   */
  isFormValid(): boolean {
    return this.form.valid;
  }

  /**
   * Submit registration form
   */
  submit(): void {
    if (!this.isFormValid()) {
      this.markFormGroupTouched();
      return;
    }

    this.serverMessage.set('');
    this.isSuccess.set(false);

    const { confirmPassword, ...formData } = this.form.value;
    const registerData: RegisterRequest = formData;

    this.subscription = this.auth.register(registerData).subscribe({
      next: (response: any) => {
        console.log('Registration response:', response);
        
        if ((response as FailResponse).status_type === 'fail') {
          this.handleRegistrationError((response as FailResponse).response_message || 'Registration failed');
        } else {
          this.handleRegistrationSuccess(response as RegisterSuccess);
        }
      },
      error: (error: any) => {
        console.error('Registration error:', error);
        const errorMessage = error?.error?.response_message || 
                           error?.message || 
                           'Network error. Please check your connection and try again.';
        this.handleRegistrationError(errorMessage);
      }
    });
  }

  /**
   * Handle successful registration
   */
  private handleRegistrationSuccess(response: RegisterSuccess): void {
    this.isSuccess.set(true);
    const message = response.response_message || 'Account created successfully!';
    this.serverMessage.set(message);
    
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['snackbar-success']
    });

    // Navigate to login after successful registration
    setTimeout(() => {
      this.router.navigate(['/login'], {
        queryParams: { 
          email: this.form.get('email')?.value,
          registered: 'true'
        }
      });
    }, 2000);
  }

  /**
   * Handle registration errors
   */
  private handleRegistrationError(errorMessage: string): void {
    this.isSuccess.set(false);
    this.serverMessage.set(errorMessage);
    
    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  /**
   * Mark all form fields as touched to trigger validation messages
   */
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Navigate to login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Clear all form data
   */
  clearForm(): void {
    this.form.reset();
    this.serverMessage.set('');
    this.isSuccess.set(false);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}