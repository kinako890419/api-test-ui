import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserProfileResp } from '../../models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {
  private usersSvc = inject(UserService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  error = signal('');
  users = signal<UserProfileResp[]>([]);
  // Toggle to view deleted users (read-only)
  viewDeleted = signal(false);

  ngOnInit() {
    const isAdmin = this.auth.currentUser()?.user_role === 'ADMIN';
    if (!isAdmin) {
      this.error.set('Not authorized');
      return;
    }
    this.refresh();
  }

  refresh() {
    const isDeletedParam = this.viewDeleted() ? 'true' : undefined;
    this.usersSvc.getAll(isDeletedParam).subscribe({
      next: (u) => this.users.set(u),
      error: (err) => this.error.set(err?.error?.response_message || 'Failed to load users')
    });
  }

  grantAdmin(user: UserProfileResp) {
    if (user.user_role === 'ADMIN') return;
    this.usersSvc.edit(user.user_id, { is_admin: true }).subscribe({
      next: () => { this.snack.open('Granted ADMIN', 'Close', { duration: 2000 }); this.refresh(); },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to grant ADMIN', 'Close', { duration: 3000 })
    });
  }

  deleteUser(user: UserProfileResp) {
    if (!confirm(`Delete user ${user.user_name}?`)) return;
    this.usersSvc.delete(user.user_id).subscribe({
      next: () => { this.snack.open('User deleted', 'Close', { duration: 2000 }); this.refresh(); },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to delete user', 'Close', { duration: 3000 })
    });
  }
}
