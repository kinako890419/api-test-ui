import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services and Models
import { AuthService } from '../../services/auth.service';
import { FailResponse, LoginSuccess, LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  loading = false;
  errorMsg = '';
  hidePassword = true;
  private loginSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.checkIfAlreadyAuthenticated();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  /**
   * Initialize the reactive form with validation rules
   */
  private initializeForm(): void {
    this.form = this.formBuilder.group({
      user_mail: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(50)
        ]
      ],
      user_password: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100)
        ]
      ],
    });
  }

  /**
   * Check if user is already authenticated and redirect if so
   */
  private checkIfAlreadyAuthenticated(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/projects']);
    }
  }

  /**
   * Handle form submission
   */
  submit(): void {
    if (this.form.invalid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.startLoading();
    const loginRequest: LoginRequest = this.form.value;

    this.loginSubscription = this.authService.login(loginRequest)
      .pipe(
        finalize(() => this.stopLoading())
      )
      .subscribe({
        next: (response) => this.handleLoginResponse(response),
        error: (error) => this.handleLoginError(error)
      });
  }

  /**
   * Handle successful login response
   */
  private handleLoginResponse(response: LoginSuccess | FailResponse): void {
    if (this.isFailResponse(response)) {
      this.errorMsg = response.response_message || 'Login failed. Please try again.';
      return;
    }

    const loginSuccess = response as LoginSuccess;
    this.authService.setSession(loginSuccess);
    this.navigateToProjects();
  }

  /**
   * Handle login error
   */
  private handleLoginError(error: any): void {
    console.error('Login error:', error);
    this.errorMsg = this.extractErrorMessage(error);
  }

  /**
   * Extract error message from error response
   */
  private extractErrorMessage(error: any): string {
    return error?.error?.response_message || 
           error?.message || 
           'Network error. Please check your connection and try again.';
  }

  /**
   * Check if response is a failure response
   */
  private isFailResponse(response: LoginSuccess | FailResponse): response is FailResponse {
    return (response as FailResponse).status_type === 'fail';
  }

  /**
   * Navigate to projects page after successful login
   */
  private navigateToProjects(): void {
    this.router.navigate(['/projects']);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  /**
   * Start loading state
   */
  private startLoading(): void {
    this.loading = true;
    this.errorMsg = '';
  }

  /**
   * Stop loading state
   */
  private stopLoading(): void {
    this.loading = false;
  }

  /**
   * Clean up subscriptions to prevent memory leaks
   */
  private cleanupSubscriptions(): void {
    this.loginSubscription?.unsubscribe();
  }

  /**
   * Get specific form field error message
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} is required`;
    }
    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field?.hasError('minlength')) {
      const requiredLength = field.getError('minlength')?.requiredLength;
      return `${this.getFieldDisplayName(fieldName)} must be at least ${requiredLength} characters`;
    }
    if (field?.hasError('maxlength')) {
      const requiredLength = field.getError('maxlength')?.requiredLength;
      return `${this.getFieldDisplayName(fieldName)} must be less than ${requiredLength} characters`;
    }
    return '';
  }

  /**
   * Get user-friendly field display name
   */
  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'user_mail': 'Email',
      'user_password': 'Password'
    };
    return fieldNames[fieldName] || fieldName;
  }
}