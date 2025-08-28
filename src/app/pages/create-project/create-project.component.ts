import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService } from '../../services/project.service';
import { CreateProjectReq, ProjStatus } from '../../models';

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
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  providers: [DatePipe],
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.css']
})
export class CreateProjectComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CreateProjectComponent>, { optional: true });
  private readonly datePipe = inject(DatePipe);

  // State signals
  readonly saving = signal<boolean>(false);
  readonly error = signal<string>('');

  // Form without client-side validation
  readonly form: FormGroup = this.fb.group({
    project_name: [''],
    project_description: [''],
  project_status: ['PENDING'],
  deadline: [null]
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
    this.saving.set(true);
    this.error.set('');

    const raw = this.form.value;
    const newProject: CreateProjectReq = {
      project_name: raw.project_name,
      project_description: raw.project_description || undefined,
      project_status: raw.project_status || undefined,
      // API requires deadline (yyyy-MM-dd)
      deadline: this.datePipe.transform(raw.deadline, 'yyyy-MM-dd') || ''
    };

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
        this.saving.set(false);
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
}
