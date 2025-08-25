import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FailResponse, RegisterSuccess } from '../../models/auth.models';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-register',
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
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnDestroy {
  form: FormGroup;
  loading = false;
  serverMsg = '';
  isSuccess = false;
  private sub?: Subscription;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
    user_name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.serverMsg = '';

    this.sub = this.auth.register(this.form.value as any).subscribe({
      next: (res) => {
      console.log('Register response:', res);
      if ((res as FailResponse).status_type === 'fail') {
        this.isSuccess = false;
        this.serverMsg = (res as FailResponse).response_message || 'Registration failed';
      } else {
        const ok = res as RegisterSuccess;
        this.isSuccess = true;
        this.serverMsg = ok.response_message || 'Registered successfully';
        // Optionally send user to login
        // setTimeout(() => this.router.navigate(['/login']), 1000);
      }
    },
    error: (err) => {
      console.error('Register error:', err);
      this.isSuccess = false;
      this.serverMsg = err?.error?.response_message || 'Network or server error';
    },
      complete: () => (this.loading = false),
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}