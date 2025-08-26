import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService, CreateProjectReq } from '../../services/project.service';
import { ProjStatus } from '../../models/project.models';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.css']
})
export class CreateProjectComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CreateProjectComponent>, { optional: true });

  // State signals
  readonly saving = signal<boolean>(false);
  readonly error = signal<string>('');

  // Form
  readonly form: FormGroup = this.fb.group({
    project_name: ['', [Validators.required, Validators.maxLength(50)]],
    project_description: ['', [Validators.maxLength(250)]],
    project_status: ['PENDING', [Validators.required]]
  });

  // Status options
  readonly statusOptions: { value: ProjStatus; label: string; icon: string }[] = [
    { value: 'PENDING', label: 'Pending', icon: 'schedule' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: 'work' },
    { value: 'COMPLETED', label: 'Completed', icon: 'check_circle' }
  ];

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const newProject: CreateProjectReq = this.form.value;

    this.projectService.create(newProject).subscribe({
      next: (response) => {
        this.snackBar.open('Project created successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Close dialog if in dialog mode, otherwise navigate
        if (this.dialogRef) {
          this.dialogRef.close(true); // Pass true to indicate success
        } else {
          this.router.navigate(['/projects']);
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message ||
                           err?.message ||
                           'Failed to create project';
        this.error.set(errorMessage);
        console.error('Failed to create project:', err);

        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      },
      complete: () => {
        this.saving.set(false);
      }
    });
  }

  /**
   * Cancel creating and close dialog or navigate back
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get form field error message
   */
  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }

    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} cannot exceed ${maxLength} characters`;
    }

    return 'Invalid input';
  }

  /**
   * Get user-friendly field label
   */
  private getFieldLabel(fieldName: string): string {
    switch (fieldName) {
      case 'project_name':
        return 'Project name';
      case 'project_description':
        return 'Project description';
      case 'project_status':
        return 'Project status';
      default:
        return fieldName;
    }
  }

  /**
   * Check if form field has error and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.errors && control.touched);
  }
}
