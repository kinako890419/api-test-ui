import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfileResp, EditUserInfoReq } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  private usersSvc = inject(UserService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  error = signal('');
  me = signal<UserProfileResp | null>(null);
  form: EditUserInfoReq = {};
  saving = signal(false);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const current = this.auth.currentUser();
    if (!current || !id || (id !== current.user_id)) {
      // Only allow self-profile for now
      this.router.navigate(['/login']);
      return;
    }
    this.usersSvc.getById(id).subscribe({
      next: (u) => {
        this.me.set(u);
        this.form = { user_name: u.user_name, user_email: u.user_email };
      },
      error: (err) => this.error.set(err?.error?.response_message || 'Failed to load profile')
    });
  }

  canEdit(): boolean {
    // ADMIN cannot edit others here; this page is self-only; allow both roles
    return !!this.me();
  }

  save() {
    const u = this.me();
    if (!u) return;
    const nextName = (this.form.user_name || '').trim();
    const nextEmail = (this.form.user_email || '').trim();
    const nameChanged = nextName !== u.user_name;
    const emailChanged = nextEmail !== u.user_email;
    const payload: EditUserInfoReq = {};
    if (nameChanged) payload.user_name = nextName;
    if (emailChanged) payload.user_email = nextEmail;
    if (!nameChanged && !emailChanged) {
      this.snack.open('Nothing changed', 'Close', { duration: 2000 });
      return;
    }
    this.saving.set(true);
    this.usersSvc.edit(u.user_id, payload).subscribe({
      next: () => {
        this.snack.open('Profile updated', 'Close', { duration: 2000 });
        if (emailChanged) {
          this.snack.open('Email changed, please login again', 'Close', { duration: 4000 });
          this.auth.clearSession();
          this.router.navigate(['/login']);
        } else {
          this.ngOnInit();
        }
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to save', 'Close', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }
}
