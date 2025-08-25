import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { 
  ProjectService, 
  ProjDetailsResp, 
  TaskListResp, 
  ViewAllTaskResp,
  ProjStatus 
} from '../../services/project.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule
  ],
  providers: [DatePipe],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ProjectService);
  private auth = inject(AuthService);
  private datePipe = inject(DatePipe);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  tasksLoading = signal(false);
  error = signal('');
  tasksError = signal('');
  project = signal<ProjDetailsResp | null>(null);
  allTasks = signal<TaskListResp[]>([]);

  // Computed signals for task columns
  pendingTasks = computed(() => 
    this.allTasks().filter(task => (task.status || 'PENDING') === 'PENDING')
  );
  
  inProgressTasks = computed(() => 
    this.allTasks().filter(task => task.status === 'IN_PROGRESS')
  );
  
  completedTasks = computed(() => 
    this.allTasks().filter(task => task.status === 'COMPLETED')
  );

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Invalid project id');
      return;
    }
    this.loadProjectAndTasks(id);
  }

  private loadProjectAndTasks(id: number) {
    // Load project details
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: (p) => this.project.set(p),
      error: (err) => this.error.set(err?.error?.response_message || 'Failed to load project'),
      complete: () => this.loading.set(false),
    });

    // Load project tasks
    this.loadTasks(id);
  }

  private loadTasks(projectId: number) {
    this.tasksLoading.set(true);
    this.tasksError.set('');
    
    this.svc.getProjectTasks(projectId).subscribe({
      next: (response: ViewAllTaskResp) => {
        this.allTasks.set(response.tasks_list || []);
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message || 'Failed to load tasks';
        this.tasksError.set(errorMessage);
        console.error('Failed to load tasks:', err);
      },
      complete: () => {
        this.tasksLoading.set(false);
      }
    });
  }

  /**
   * Navigate to edit project page
   */
  editProject(): void {
    const project = this.project();
    if (project) {
      this.router.navigate(['/projects', project.project_id, 'edit']);
    }
  }

  /**
   * Check if current user can edit this project
   */
  canEditProject(): boolean {
    const project = this.project();
    const currentUser = this.auth.currentUser();
    
    if (!project || !currentUser) {
      return false;
    }

    // User can edit if they are the creator or have OWNER role
    const isCreator = project.creator_id === currentUser.user_id;
    const isOwner = project.member_list?.some(
      member => member.user_id === currentUser.user_id && member.user_project_role === 'OWNER'
    );

    return isCreator || !!isOwner;
  }

  /**
   * Get edit button text based on project status
   */
  getEditButtonText(): string {
    const project = this.project();
    return project?.project_status === 'COMPLETED' ? 'Edit Status' : 'Edit Project';
  }

  /**
   * Get edit button tooltip
   */
  getEditTooltip(): string {
    const project = this.project();
    if (!project) return '';
    
    if (project.project_status === 'COMPLETED') {
      return 'Completed projects can only have their status modified';
    }
    return 'Edit project details';
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) {
      return 'N/A';
    }

    try {
      const formatted = this.datePipe.transform(dateString, 'MMM d, y');
      return formatted || 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  }

  /**
   * Get status icon for tasks
   */
  getTaskStatusIcon(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'schedule';
      case 'IN_PROGRESS':
        return 'work';
      case 'COMPLETED':
        return 'check_circle';
      default:
        return 'help_outline';
    }
  }

  /**
   * Get status class for tasks
   */
  getTaskStatusClass(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'COMPLETED':
        return 'completed';
      default:
        return 'default';
    }
  }

  /**
   * Get status label for tasks
   */
  getTaskStatusLabel(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Navigate to task detail (placeholder for future implementation)
   */
  openTask(task: TaskListResp) {
    const project = this.project();
    if (project && task.task_id) {
      // TODO: Navigate to task detail page when implemented
      console.log('Navigate to task:', project.project_id, task.task_id);
    }
  }

  /**
   * Refresh tasks data
   */
  refreshTasks() {
    const project = this.project();
    if (project) {
      this.loadTasks(project.project_id);
    }
  }

  /**
   * Delete current project with confirmation
   */
  deleteProject(): void {
    const project = this.project();
    if (!project) return;
    
    if (confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
      this.svc.delete(project.project_id).subscribe({
        next: () => {
          this.snackBar.open('Project deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/projects']);
        },
        error: (error) => {
          console.error('Error deleting project:', error);
          this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Go back to projects list
   */
  goBack(): void {
    this.router.navigate(['/projects']);
  }
}
