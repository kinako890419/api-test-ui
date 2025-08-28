import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { ProjDetailsResp, EditProjectReq, ProjStatus } from '../../models';

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
  MatDatepickerModule,
  MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './edit-project.component.html',
  styleUrls: ['./edit-project.component.css'],
  providers: [DatePipe]
})
export class EditProjectComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly datePipe = inject(DatePipe);

  // State signals
  readonly saving = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly project = signal<ProjDetailsResp | null>(null);

  // Form without client-side validation
  readonly form: FormGroup = this.fb.group({
    project_name: [''],
    project_description: [''],
  project_status: [''],
  deadline: [null]
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
    this.error.set('');

    this.projectService.getById(id).subscribe({
      next: (project) => {
        this.project.set(project);

        // Populate form with existing data
        this.form.patchValue({
          project_name: project.project_name || '',
          project_description: project.project_description || '',
          project_status: project.project_status || 'PENDING',
          deadline: project.deadline ? new Date(project.deadline) : null
        });

        // // If project is completed, disable name and description fields
        // if (project.project_status === 'COMPLETED') {
        //   this.form.get('project_name')?.disable();
        //   this.form.get('project_description')?.disable();
        //   this.form.get('deadline')?.disable();
        // }
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message ||
                           err?.message ||
                           'Failed to load project details';
        this.error.set(errorMessage);
        console.error('Failed to load project:', err);
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
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

    // Include deadline per API requirement (required in EditProjectReq)
    const deadlineControl = this.form.get('deadline');
    if (deadlineControl) {
      const d: Date | null = deadlineControl.value;
      // If control is disabled or empty, fall back to current project deadline
      let effectiveDate: Date | null = d;
      if (!effectiveDate) {
        const current = this.project();
        effectiveDate = current?.deadline ? new Date(current.deadline) : null;
      }
      if (effectiveDate) {
        updates.deadline = this.datePipe.transform(effectiveDate, 'yyyy-MM-dd') || undefined;
      }
    }

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
        this.saving.set(false);
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
}
