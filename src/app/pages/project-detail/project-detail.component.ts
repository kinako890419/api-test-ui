import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Service and model imports
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import {
  ProjDetailsResp,
  ProjectMemberRole,
  TagsResp,
  ProjStatus,
  Order,
  TaskListResp,
  ViewAllTaskResp,
  TaskQuery,
  UserProfileResp
} from '../../models';

// Dialog component
import { TagDetailsDialogComponent } from './tag-details-dialog.component';

interface NewTaskForm {
  task_name: string;
  task_description: string;
  task_status: ProjStatus | string;
  task_deadline: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatDialogModule,
    DragDropModule,
  ],
  providers: [DatePipe],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  // Injected services
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly datePipe = inject(DatePipe);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Lifecycle management
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly error = signal('');
  readonly tasksError = signal('');
  readonly project = signal<ProjDetailsResp | null>(null);

  // Task collections by status
  readonly pendingTasks = signal<TaskListResp[]>([]);
  readonly inProgressTasks = signal<TaskListResp[]>([]);
  readonly completedTasks = signal<TaskListResp[]>([]);

  // Task sorting state
  taskSortBy: TaskQuery['sortBy'] = 'updatedAt';
  taskSortOrder: Order = 'desc';

  // Members management state
  readonly allUsers = signal<UserProfileResp[]>([]);
  inviteUserId: number | null = null;
  inviteRole: ProjectMemberRole = 'USER';
  readonly savingInvite = signal(false);
  readonly savingRole = signal(false);
  readonly removingUserId = signal<number | null>(null);

  // Task creation state
  readonly showNewTaskForm = signal(false);
  readonly savingNewTask = signal(false);
  newTask: NewTaskForm = this.getInitialTaskForm();
  deadlineDate: Date | null = null;

  // Tags state
  readonly tags = signal<TagsResp[]>([]);
  newTagName = '';
  editingTagId: number | null = null;
  editingTagName = '';

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public methods

  /**
   * Handle task sorting changes
   */
  onSortChange(): void {
    const project = this.project();
    if (project) {
      this.loadTasks(project.project_id);
    }
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
   * Delete current project with confirmation
   */
  deleteProject(): void {
    const project = this.project();
    if (!project) return;

    const confirmMessage = `Are you sure you want to delete project "${project.project_name}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.projectService.delete(project.project_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Project deleted successfully');
            this.router.navigate(['/projects']);
          },
          error: (error) => {
            console.error('Error deleting project:', error);
            this.showError('Failed to delete project');
          }
        });
    }
  }

  /**
   * Invite a user to this project
   */
  inviteMember(): void {
    const project = this.project();
    if (!project || !this.inviteUserId) return;

    this.savingInvite.set(true);

    this.projectService.inviteMembers(project.project_id, [{
      user_id: this.inviteUserId,
      user_role: this.inviteRole
    }])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.showSuccess(response.response_message || 'Member invited successfully');
        this.refreshProjectDetails(project.project_id);
        this.resetInviteForm();
      },
      error: (error) => {
        const message = error?.error?.response_message || 'Failed to invite member';
        this.showError(message);
        this.savingInvite.set(false);
      },
      complete: () => this.savingInvite.set(false)
    });
  }

  /**
   * Change member role in project
   */
  changeMemberRole(userId: number, newRole: ProjectMemberRole): void {
    const project = this.project();
    if (!project) return;

    this.savingRole.set(true);

    this.projectService.setMemberRole(project.project_id, {
      user_id: userId,
      user_role: newRole
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.showSuccess(response.response_message || 'Role updated successfully');
        this.refreshProjectDetails(project.project_id);
      },
      error: (error) => {
        const message = error?.error?.response_message || 'Failed to update role';
        this.showError(message);
        this.savingRole.set(false);
      },
      complete: () => this.savingRole.set(false)
    });
  }

  /**
   * Remove member from project
   */
  removeMember(userId: number): void {
    const project = this.project();
    if (!project) return;

    const currentUser = this.authService.currentUser();
    const isLeavingProject = currentUser?.user_id === userId;
    const confirmMessage = isLeavingProject
      ? 'Are you sure you want to leave this project?'
      : 'Are you sure you want to remove this member from the project?';

    if (!confirm(confirmMessage)) return;

    this.removingUserId.set(userId);

    this.projectService.removeMember(project.project_id, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const message = response.response_message ||
            (isLeavingProject ? 'Left project successfully' : 'Member removed successfully');
          this.showSuccess(message);

          if (isLeavingProject) {
            this.router.navigate(['/projects']);
          } else {
            this.refreshProjectDetails(project.project_id);
          }
        },
        error: (error) => {
          const message = error?.error?.response_message ||
            (isLeavingProject ? 'Failed to leave project' : 'Failed to remove member');
          this.showError(message);
          this.removingUserId.set(null);
        },
        complete: () => this.removingUserId.set(null)
      });
  }

  /**
   * Create a new task in the project
   */
  createTask(): void {
    const project = this.project();
    if (!project || !this.isValidTaskForm()) return;

    this.savingNewTask.set(true);
    const formattedDeadline = this.datePipe.transform(this.deadlineDate, 'yyyy-MM-dd') || '';

    this.taskService.addTask(project.project_id, {
      task_name: this.newTask.task_name.trim(),
      task_description: this.newTask.task_description?.trim() || undefined,
      task_status: this.newTask.task_status || undefined,
      task_deadline: formattedDeadline,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.showSuccess(response.response_message || 'Task created successfully');
        this.resetTaskForm();
        this.refreshTasks();
      },
      error: (error) => {
        const message = error?.error?.response_message || 'Failed to create task';
        this.showError(message);
        this.savingNewTask.set(false);
      },
      complete: () => this.savingNewTask.set(false)
    });
  }

  /**
   * Add a new tag to the project
   */
  addTag(): void {
    const project = this.project();
    const tagName = this.newTagName.trim();
    if (!project || !tagName) return;

    this.projectService.addProjectTag(project.project_id, { tag_name: tagName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.showSuccess(response.response_message || 'Tag added successfully');
          this.newTagName = '';
          this.loadTags(project.project_id);
        },
        error: (error) => {
          const message = error?.error?.response_message || 'Failed to add tag';
          this.showError(message);
        }
      });
  }

  /**
   * Start editing a tag
   */
  startEditTag(tag: TagsResp): void {
    this.editingTagId = tag.tag_id;
    this.editingTagName = tag.tag_name;
  }

  /**
   * Cancel tag editing
   */
  cancelEditTag(): void {
    this.editingTagId = null;
    this.editingTagName = '';
  }

  /**
   * Save edited tag
   */
  saveEditTag(tagId: number): void {
    const project = this.project();
    const tagName = this.editingTagName.trim();
    if (!project || !tagName) return;

    this.projectService.editProjectTag(project.project_id, tagId, { tag_name: tagName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.showSuccess(response.response_message || 'Tag updated successfully');
          this.cancelEditTag();
          this.loadTags(project.project_id);
        },
        error: (error) => {
          const message = error?.error?.response_message || 'Failed to update tag';
          this.showError(message);
        }
      });
  }

  /**
   * Delete a tag
   */
  deleteTag(tagId: number): void {
    const project = this.project();
    if (!project) return;

    if (!confirm('Are you sure you want to delete this tag?')) return;

    this.projectService.deleteProjectTag(project.project_id, tagId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.showSuccess(response.response_message || 'Tag deleted successfully');
          this.loadTags(project.project_id);
        },
        error: (error) => {
          const message = error?.error?.response_message || 'Failed to delete tag';
          this.showError(message);
        }
      });
  }

  /**
   * Show tag details in a dialog
   */
  showTagDetails(tag: TagsResp): void {
    this.dialog.open(TagDetailsDialogComponent, {
      width: '500px',
      data: tag
    });
  }

  /**
   * Open task detail page
   */
  openTask(task: TaskListResp): void {
    const project = this.project();
    if (project && task.task_id) {
      this.router.navigate(['/projects', project.project_id, 'tasks', task.task_id]);
    }
  }

  /**
   * Refresh tasks data
   */
  refreshTasks(): void {
    const project = this.project();
    if (project) {
      this.loadTasks(project.project_id);
    }
  }

  /**
   * Go back to projects list
   */
  goBack(): void {
    this.router.navigate(['/projects']);
  }

  // Permission checking methods

  /**
   * Check if current user can edit this project
   */
  canEditProject(): boolean {
  // Frontend no longer restricts edit; backend enforces permissions
  return !!this.project();
  }

  /**
   * Check if current user can manage members
   */
  canManageMembers(): boolean {
  // Frontend allows showing member management; backend validates actions
  return !!this.project();
  }

  /**
   * Check if current user can create tasks
   */
  canCreateTask(): boolean {
  // Allow task creation UI; backend will enforce membership and status rules
  return !!this.project();
  }

  /**
   * Check if user can leave project
   */
  canLeaveMember(memberUserId: number): boolean {
  // Allow leave action button to be shown for current user
  const currentUser = this.authService.currentUser();
  return !!currentUser && currentUser.user_id === memberUserId;
  }

  // Utility methods

  /**
   * Check if user is already a member
   */
  isAlreadyMember(userId: number | null | undefined): boolean {
    if (!userId) return false;
    const project = this.project();
    return !!project?.member_list?.some(m => m.user_id === userId);
  }

  // Removed trivial helpers getEditButtonText/getEditTooltip; inline strings in template

  /**
   * Get project status icon
   */
  getProjectStatusIcon(status: ProjStatus | null | undefined): string {
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
   * Format date for display
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';

    try {
      const formatted = this.datePipe.transform(dateString, 'MMM d, y, h:mm a');
      return formatted || 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  }

  // TrackBy functions for performance optimization

  /**
   * TrackBy function for member list
   */
  trackByMemberId(index: number, member: any): number {
    return member?.user_id || index;
  }

  /**
   * TrackBy function for tags list
   */
  trackByTagId(index: number, tag: TagsResp): number {
    return tag?.tag_id || index;
  }

  /**
   * TrackBy function for tasks list
   */
  trackByTaskId(index: number, task: TaskListResp): number {
    return task?.task_id || index;
  }

  // Private methods

  /**
   * Initialize the component
   */
  private initializeComponent(): void {
    const projectId = this.getProjectIdFromRoute();
    if (!projectId) {
      this.error.set('Invalid project ID');
      return;
    }

    this.loadProjectAndRelatedData(projectId);
  }

  /**
   * Get project ID from route parameters
   */
  private getProjectIdFromRoute(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return id || null;
  }

  /**
   * Load project and all related data
   */
  private loadProjectAndRelatedData(projectId: number): void {
    this.error.set('');

    // Load project details
    this.projectService.getById(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (project) => {
          this.project.set(project);
        },
        error: (error) => {
          const message = error?.error?.response_message || 'Failed to load project';
          this.error.set(message);
        }
      });

    // Load tasks, tags, and users concurrently
    this.loadTasks(projectId);
    this.loadTags(projectId);
    this.loadUsers();
  }

  /**
   * Load project tasks by status
   */
  private loadTasks(projectId: number): void {
    this.tasksError.set('');

    const baseQuery: TaskQuery = {
      sortBy: this.taskSortBy,
      order: this.taskSortOrder
    };

    forkJoin({
      pending: this.taskService.getProjectTasks(projectId, {
        ...baseQuery,
        status: 'PENDING'
      }),
      inProgress: this.taskService.getProjectTasks(projectId, {
        ...baseQuery,
        status: 'IN_PROGRESS'
      }),
      completed: this.taskService.getProjectTasks(projectId, {
        ...baseQuery,
        status: 'COMPLETED'
      }),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ pending, inProgress, completed }) => {
        let pendingList = pending.tasks_list || [];
        let inProgressList = inProgress.tasks_list || [];
        let completedList = completed.tasks_list || [];

        // If sorting by deadline is requested but backend doesn't support it,
        // perform client-side sorting as a fallback.
        if (this.taskSortBy === 'deadline') {
          pendingList = this.sortTasksByDeadline(pendingList, this.taskSortOrder);
          inProgressList = this.sortTasksByDeadline(inProgressList, this.taskSortOrder);
          completedList = this.sortTasksByDeadline(completedList, this.taskSortOrder);
        }

        this.pendingTasks.set(pendingList);
        this.inProgressTasks.set(inProgressList);
        this.completedTasks.set(completedList);
      },
      error: (error) => {
        const message = error?.error?.response_message || 'Failed to load tasks';
        this.tasksError.set(message);
        console.error('Failed to load tasks:', error);
      }
    });
  }

  /**
   * Sort tasks by their deadline date. Tasks without a deadline will be treated as
   * greater than dated tasks when sorting ascending (so they appear last), and vice versa.
   */
  private sortTasksByDeadline(list: TaskListResp[], order: Order): TaskListResp[] {
    const compare = (a: TaskListResp, b: TaskListResp) => {
      const aVal = a.task_deadline ? new Date(a.task_deadline).getTime() : null;
      const bVal = b.task_deadline ? new Date(b.task_deadline).getTime() : null;

      if (aVal === bVal) return 0;
      // Treat null (no deadline) as greater than any date
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      return aVal < bVal ? -1 : 1;
    };

    const sorted = [...list].sort((a, b) => compare(a, b));
    return order === 'desc' ? sorted.reverse() : sorted;
  }

  /**
   * Load project tags
   */
  private loadTags(projectId: number): void {
    this.projectService.getProjectTags(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tags.set(response.tags || []);
        },
        error: (error) => {
          const message = error?.error?.response_message || 'Failed to load tags';
          this.showError(message);
        }
      });
  }

  /**
   * Load all users for invitation
   */
  private loadUsers(): void {
    this.userService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Show all users; backend will enforce invitation permissions
          this.allUsers.set(users);
        },
        error: (error) => {
          console.error('Failed to load users:', error);
          // Not showing error to user as this is optional for invitation feature
        }
      });
  }

  /**
   * Refresh project details
   */
  private refreshProjectDetails(projectId: number): void {
    this.projectService.getById(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (project) => this.project.set(project),
        error: (error) => {
          console.error('Failed to refresh project details:', error);
        }
      });
  }

  /**
   * Get initial task form state
   */
  private getInitialTaskForm(): NewTaskForm {
    return {
      task_name: '',
      task_description: '',
      task_status: 'PENDING',
      task_deadline: '',
    };
  }

  /**
   * Reset task form to initial state
   */
  private resetTaskForm(): void {
    this.newTask = this.getInitialTaskForm();
    this.deadlineDate = null;
    this.showNewTaskForm.set(false);
  }

  /**
   * Reset invite form to initial state
   */
  private resetInviteForm(): void {
    this.inviteUserId = null;
    this.inviteRole = 'USER';
  }

  /**
   * Validate task form before submission
   */
  private isValidTaskForm(): boolean {
    const { task_name } = this.newTask;

    if (!task_name?.trim()) {
      this.showError('Task name is required');
      return false;
    }

    if (!this.deadlineDate) {
      this.showError('Task deadline is required');
      return false;
    }

    return true;
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar']
    });
  }
}
