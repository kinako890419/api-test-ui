import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjDetailsResp, ProjectMemberRole, TagsResp } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { TaskListResp, ViewAllTaskResp, TaskQuery } from '../../models/task.models';
import type { Order } from '../../models/task.models';
import { ProjStatus } from '../../models/project.models';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfileResp } from '../../services/user.service';

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
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
  MatChipsModule,
  MatSelectModule,
  MatDatepickerModule,
  MatNativeDateModule,
    FormsModule,
  ],
  providers: [DatePipe],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css']
})
export class ProjectDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ProjectService);
  private taskSvc = inject(TaskService);
  private auth = inject(AuthService);
  private usersSvc = inject(UserService);
  private datePipe = inject(DatePipe);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  tasksLoading = signal(false);
  error = signal('');
  tasksError = signal('');
  project = signal<ProjDetailsResp | null>(null);
  // Tasks collections by status (sorted by backend using sortBy/order)
  pendingTasks = signal<TaskListResp[]>([]);
  inProgressTasks = signal<TaskListResp[]>([]);
  completedTasks = signal<TaskListResp[]>([]);

  // Sorting state for tasks
  taskSortBy: TaskQuery['sortBy'] = 'updatedAt';
  taskSortOrder: Order = 'desc';
  // Members management state
  allUsers = signal<UserProfileResp[]>([]);
  inviteUserId: number | null = null;
  inviteRole: ProjectMemberRole = 'USER';
  savingInvite = signal(false);
  savingRole = signal(false);
  removingUserId = signal<number | null>(null);
  // Task creation state
  showNewTaskForm = signal(false);
  savingNewTask = signal(false);
  newTask = {
    task_name: '',
    task_description: '',
    task_status: 'PENDING' as ProjStatus | string,
    task_deadline: '', // yyyy-MM-dd
  };
  // Datepicker model for create-task deadline
  deadlineDate: Date | null = null;

  // Tags state
  tags = signal<TagsResp[]>([]);
  tagsLoading = signal(false);
  newTagName = '';
  editingTagId: number | null = null;
  editingTagName = '';


  // Sorting change handler
  onSortChange() {
    const p = this.project();
    if (p) this.loadTasks(p.project_id);
  }

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

  // Load project tags
  this.loadTags(id);

    // Preload users to invite (optional)
    this.usersSvc.getAll().subscribe({
      next: (users) => {
        const isAdmin = this.auth.currentUser()?.user_role === 'ADMIN';
        this.allUsers.set(isAdmin ? users : users.filter(u => u.user_role !== 'ADMIN'));
      },
      error: () => {},
    });
  }

  private loadTags(projectId: number) {
    this.tagsLoading.set(true);
    this.svc.getProjectTags(projectId).subscribe({
      next: (resp) => this.tags.set(resp.tags || []),
      error: (err) => this.snackBar.open(err?.error?.response_message || 'Failed to load tags', 'Close', { duration: 2500 }),
      complete: () => this.tagsLoading.set(false),
    });
  }

  addTag() {
    const p = this.project();
    const name = this.newTagName.trim();
    if (!p || !name) return;
    this.svc.addProjectTag(p.project_id, { tag_name: name }).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Tag added', 'Close', { duration: 2000 });
        this.newTagName = '';
        this.loadTags(p.project_id);
      },
      error: (err) => this.snackBar.open(err?.error?.response_message || 'Failed to add tag', 'Close', { duration: 3000 })
    });
  }

  startEditTag(tag: TagsResp) {
    this.editingTagId = tag.tag_id;
    this.editingTagName = tag.tag_name;
  }

  cancelEditTag() {
    this.editingTagId = null;
    this.editingTagName = '';
  }

  saveEditTag(tagId: number) {
    const p = this.project();
    const name = this.editingTagName.trim();
    if (!p || !name) return;
    this.svc.editProjectTag(p.project_id, tagId, { tag_name: name }).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Tag updated', 'Close', { duration: 2000 });
        this.cancelEditTag();
        this.loadTags(p.project_id);
      },
      error: (err) => this.snackBar.open(err?.error?.response_message || 'Failed to update tag', 'Close', { duration: 3000 })
    });
  }

  deleteTag(tagId: number) {
    const p = this.project();
    if (!p) return;
    this.svc.deleteProjectTag(p.project_id, tagId).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Tag deleted', 'Close', { duration: 2000 });
        this.loadTags(p.project_id);
      },
      error: (err) => this.snackBar.open(err?.error?.response_message || 'Failed to delete tag', 'Close', { duration: 3000 })
    });
  }

  private loadTasks(projectId: number) {
    this.tasksLoading.set(true);
    this.tasksError.set('');

  // Ask backend to sort tasks within each status using provided sortBy/order
  const base: TaskQuery = { sortBy: this.taskSortBy, order: this.taskSortOrder };

    // Use forkJoin to load all three statuses in parallel
    // Defer import to avoid top-level changes; dynamic import pattern
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        pending: this.taskSvc.getProjectTasks(projectId, { ...base, status: 'PENDING' }),
        inProgress: this.taskSvc.getProjectTasks(projectId, { ...base, status: 'IN_PROGRESS' }),
        completed: this.taskSvc.getProjectTasks(projectId, { ...base, status: 'COMPLETED' }),
      }).subscribe({
        next: ({ pending, inProgress, completed }) => {
          this.pendingTasks.set(pending.tasks_list || []);
          this.inProgressTasks.set(inProgress.tasks_list || []);
          this.completedTasks.set(completed.tasks_list || []);
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
   * Invite a user to this project
   */
  inviteMember() {
    const p = this.project();
    if (!p || !this.inviteUserId) return;
    this.savingInvite.set(true);
    this.svc.inviteMembers(p.project_id, [{ user_id: this.inviteUserId, user_role: this.inviteRole }]).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Member invited', 'Close', { duration: 2500 });
        // refresh project members
        this.svc.getById(p.project_id).subscribe({ next: (proj) => this.project.set(proj) });
        // reset form
        this.inviteUserId = null;
        this.inviteRole = 'USER';
      },
      error: (err) => {
        const msg = err?.error?.response_message || 'Failed to invite member';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      },
      complete: () => this.savingInvite.set(false)
    });
  }

  canManageMembers(): boolean {
    return this.canEditProject();
  }

  /** Update project role of a member */
  changeMemberRole(userId: number, newRole: ProjectMemberRole) {
    const p = this.project();
    if (!p) return;
    this.savingRole.set(true);
    this.svc.setMemberRole(p.project_id, { user_id: userId, user_role: newRole }).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Role updated', 'Close', { duration: 2500 });
        this.svc.getById(p.project_id).subscribe({ next: (proj) => this.project.set(proj) });
      },
      error: (err) => {
        const msg = err?.error?.response_message || 'Failed to update role';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      },
      complete: () => this.savingRole.set(false)
    });
  }

  /** Remove user from project (or leave) */
  removeMember(userId: number) {
    const p = this.project();
    if (!p) return;
    this.removingUserId.set(userId);
    this.svc.removeMember(p.project_id, userId).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Member removed', 'Close', { duration: 2500 });
        this.svc.getById(p.project_id).subscribe({ next: (proj) => this.project.set(proj) });
      },
      error: (err) => {
        const msg = err?.error?.response_message || 'Failed to remove member';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      },
      complete: () => this.removingUserId.set(null)
    });
  }

  /** Can the current user create tasks in this project */
  canCreateTask(): boolean {
    const p = this.project();
    const user = this.auth.currentUser();
    if (!p || !user) return false;
    const isMember = !!p.member_list?.some(m => m.user_id === user.user_id);
    const notCompleted = p.project_status !== 'COMPLETED';
    return isMember && notCompleted;
  }

  /** Create a new task in the project */
  createTask() {
    const p = this.project();
    if (!p) return;
    const { task_name } = this.newTask;
    if (!task_name?.trim() || !this.deadlineDate) {
      this.snackBar.open('Task name and deadline are required', 'Close', { duration: 2500 });
      return;
    }
    this.savingNewTask.set(true);
    const formattedDeadline = this.datePipe.transform(this.deadlineDate, 'yyyy-MM-dd') || '';
    this.taskSvc.addTask(p.project_id, {
      task_name: task_name.trim(),
      task_description: this.newTask.task_description?.trim() || undefined,
      task_status: this.newTask.task_status || undefined,
      task_deadline: formattedDeadline,
    }).subscribe({
      next: (res) => {
        this.snackBar.open(res.response_message || 'Task created', 'Close', { duration: 2500 });
        // reset form
        this.newTask = { task_name: '', task_description: '', task_status: 'PENDING', task_deadline: '' };
        this.deadlineDate = null;
        this.showNewTaskForm.set(false);
        this.refreshTasks();
      },
      error: (err) => this.snackBar.open(err?.error?.response_message || 'Failed to create task', 'Close', { duration: 3000 }),
      complete: () => this.savingNewTask.set(false)
    });
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

  // Helpers for template
  isAlreadyMember(userId: number | null | undefined): boolean {
    if (!userId) return false;
    const p = this.project();
    return !!p?.member_list?.some(m => m.user_id === userId);
  }

  canLeaveMember(memberUserId: number): boolean {
    const p = this.project();
    const currentUser = this.auth.currentUser();
    if (!p || !currentUser) return false;
    // cannot leave if creator, and only for self
    return currentUser.user_id === memberUserId && currentUser.user_id !== p.creator_id;
  }

  /**
   * Navigate to task detail (placeholder for future implementation)
   */
  openTask(task: TaskListResp) {
    const project = this.project();
    if (project && task.task_id) {
  this.router.navigate(['/projects', project.project_id, 'tasks', task.task_id]);
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
