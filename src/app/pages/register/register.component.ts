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

  constructor() {
    this.form = this.fb.group({
      user_name: [''],
      email: [''],
      user_password: [''],
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
   * Submit registration form
   */
  submit(): void {
    this.serverMessage.set('');
    this.isSuccess.set(false);

    const formValue = this.form.value;
    const registerData: RegisterRequest = {
      user_name: formValue.user_name,
      email: formValue.email,
      password: formValue.user_password
    };

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

    // Navigate to login after successful registration without query params
    setTimeout(() => {
      this.router.navigate(['/auth/login']);
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
   * Navigate to login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
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
