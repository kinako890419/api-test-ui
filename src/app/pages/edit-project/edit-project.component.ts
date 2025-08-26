import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProjectService, ProjDetailsResp, EditProjectReq } from '../../services/project.service';
import { ProjStatus } from '../../models/project.models';

@Component({
  selector: 'app-edit-project',
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
  templateUrl: './edit-project.component.html',
  styleUrls: ['./edit-project.component.css']
})
export class EditProjectComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly snackBar = inject(MatSnackBar);

  // State signals
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly project = signal<ProjDetailsResp | null>(null);

  // Form
  readonly form: FormGroup = this.fb.group({
    project_name: ['', [Validators.required, Validators.maxLength(50)]],
    project_description: ['', [Validators.maxLength(250)]],
    project_status: ['', [Validators.required]]
  });

  // Status options
  readonly statusOptions: { value: ProjStatus; label: string; icon: string }[] = [
    { value: 'PENDING', label: 'Pending', icon: 'schedule' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: 'work' },
    { value: 'COMPLETED', label: 'Completed', icon: 'check_circle' }
  ];

  ngOnInit(): void {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!projectId) {
      this.error.set('Invalid project ID');
      return;
    }

    this.loadProject(projectId);
  }

  /**
   * Check if the project is completed
   */
  isProjectCompleted(): boolean {
    return this.project()?.project_status === 'COMPLETED';
  }

  /**
   * Load project details and populate form
   */
  private loadProject(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.projectService.getById(id).subscribe({
      next: (project) => {
        this.project.set(project);

        // Populate form with existing data
        this.form.patchValue({
          project_name: project.project_name || '',
          project_description: project.project_description || '',
          project_status: project.project_status || 'PENDING'
        });

        // If project is completed, disable name and description fields
        if (project.project_status === 'COMPLETED') {
          this.form.get('project_name')?.disable();
          this.form.get('project_description')?.disable();
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message ||
                           err?.message ||
                           'Failed to load project details';
        this.error.set(errorMessage);
        console.error('Failed to load project:', err);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const project = this.project();
    if (!project) {
      this.error.set('Project data not available');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const updates: EditProjectReq = {};

    // Only include enabled form fields in the update
    if (this.form.get('project_name')?.enabled) {
      updates.project_name = this.form.get('project_name')?.value;
    }
    if (this.form.get('project_description')?.enabled) {
      updates.project_description = this.form.get('project_description')?.value;
    }
    // Status is always included since it's always editable
    updates.project_status = this.form.get('project_status')?.value;

    this.projectService.update(project.project_id, updates).subscribe({
      next: (response) => {
        this.snackBar.open('Project updated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Navigate back to project details
        this.router.navigate(['/projects', project.project_id]);
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message ||
                           err?.message ||
                           'Failed to update project';
        this.error.set(errorMessage);
        console.error('Failed to update project:', err);

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
   * Cancel editing and go back
   */
  onCancel(): void {
    const project = this.project();
    if (project) {
      this.router.navigate(['/projects', project.project_id]);
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
