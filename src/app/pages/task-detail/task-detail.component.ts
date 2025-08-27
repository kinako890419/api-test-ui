import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Services & Models
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import {
  ProjectUserDetailsResp,
  ProjStatus,
  TagsResp,
  TaskDetailResp,
  EditTaskReq,
  CommentContentReq,
  TaskAttachmentResp
} from '../../models';

// Dialog component
import { TagDetailsDialogComponent } from '../project-detail/tag-details-dialog.component';
import { AttachmentDetailsDialogComponent } from './attachment-details-dialog.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatDialogModule
  ],
  providers: [DatePipe],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.css']
})
export class TaskDetailComponent implements OnInit {
  // Dependency Injection
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly authService = inject(AuthService);
  private readonly datePipe = inject(DatePipe);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // Core State Signals
  error = signal<string>('');
  task = signal<TaskDetailResp | null>(null);
  projectId = signal<number | null>(null);

  // Edit State
  editing = signal<boolean>(false);
  saving = signal<boolean>(false);
  form: EditTaskReq = {};
  deadlineDate: Date | null = null;

  // Members State
  projectMembers = signal<ProjectUserDetailsResp[]>([]);
  inviteUserIds: number[] = [];
  savingInvite = signal<boolean>(false);
  removingUserId = signal<number | null>(null);

  // Comments State
  addingComment = signal<boolean>(false);
  newCommentContent = signal<string>('');
  editingCommentId = signal<number | null>(null);
  editingCommentContent = signal<string>('');

  // Tags State
  projectTags = signal<TagsResp[]>([]);
  selectedTagId: number | null = null;
  tagging = signal<boolean>(false);

  // Attachments State
  deletingId = signal<number | null>(null);

  // Computed Properties
  canManageTaskMembers = computed(() => {
    const currentTask = this.task();
    if (!currentTask || currentTask.status === 'COMPLETED') return false;
    // Allow management for project members (backend will enforce actual permissions)
    return true;
  });

  canManageTags = computed(() => {
    const currentTask = this.task();
    return !!currentTask && currentTask.status !== 'COMPLETED';
  });

  canAddComment = computed(() => {
    const currentTask = this.task();
    return !!currentTask && currentTask.status !== 'COMPLETED';
  });

  availableProjectTags = computed(() => {
    const currentTask = this.task();
    const existingTagIds = new Set((currentTask?.tags || []).map(tag => tag.tag_id));
    return (this.projectTags() || []).filter(tag => !existingTagIds.has(tag.tag_id));
  });

  ngOnInit(): void {
    this.initializeComponent();
  }

  /**
   * Initialize component by extracting route parameters and loading data
   */
  private initializeComponent(): void {
    const projectIdParam = this.route.snapshot.paramMap.get('id');
    const taskIdParam = this.route.snapshot.paramMap.get('taskId');

    const projectId = projectIdParam ? Number(projectIdParam) : null;
    const taskId = taskIdParam ? Number(taskIdParam) : null;

    if (!projectId || !taskId || isNaN(projectId) || isNaN(taskId)) {
      this.error.set('Invalid project or task ID provided');
      return;
    }

    this.projectId.set(projectId);
    this.loadTaskData(projectId, taskId);
    this.loadProjectData(projectId);
  }

  /**
   * Load task details and related data
   */
  private loadTaskData(projectId: number, taskId: number): void {
    this.error.set('');

    this.taskService.getTaskById(projectId, taskId).subscribe({
      next: (taskData) => {
        this.task.set(taskData);
        this.initializeEditForm(taskData);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to load task details';
        this.error.set(errorMessage);
      }
    });
  }

  /**
   * Load project members and tags for dropdowns
   */
  private loadProjectData(projectId: number): void {
    // Load project members
    this.projectService.getById(projectId).subscribe({
      next: (project) => {
        this.projectMembers.set(project.member_list || []);
      },
      error: (error) => {
        console.warn('Failed to load project members:', error);
      }
    });

    // Load project tags
    this.projectService.getProjectTags(projectId).subscribe({
      next: (response) => {
        this.projectTags.set(response.tags || []);
      },
      error: (error) => {
        console.warn('Failed to load project tags:', error);
      }
    });
  }

  /**
   * Initialize the edit form with current task data
   */
  private initializeEditForm(taskData: TaskDetailResp): void {
    this.form = {
      task_name: taskData.task_name,
      task_description: taskData.description,
      status: taskData.status,
      task_deadline: taskData.deadline ? taskData.deadline.substring(0, 10) : undefined,
    };

    this.deadlineDate = taskData.deadline ? new Date(taskData.deadline) : null;
  }

  /**
   * Format date string for display
   */
  format(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';

    try {
      return this.datePipe.transform(dateStr, 'MMM d, y, HH:mm') || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  /**
   * Get human-readable status label
   */
  getStatusLabel(status?: ProjStatus): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return 'Unknown';
    }
  }

  /**
   * Get appropriate icon for task status
   */
  statusIcon(status?: ProjStatus): string {
    switch (status) {
      case 'PENDING': return 'schedule';
      case 'IN_PROGRESS': return 'work';
      case 'COMPLETED': return 'check_circle';
      default: return 'help_outline';
    }
  }

  /**
   * Check if only status field should be editable (when task is completed)
   */
  onlyStatusEditable(): boolean {
    const currentTask = this.task();
    return currentTask?.status === 'COMPLETED';
  }

  /**
   * Toggle edit mode
   */
  toggleEdit(): void {
    this.editing.set(!this.editing());

    if (!this.editing()) {
      // Reset form when cancelling edit
      const currentTask = this.task();
      if (currentTask) {
        this.initializeEditForm(currentTask);
      }
    }
  }

  /**
   * Save task changes
   */
  save(): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) {
      this.showSnackBar('Missing required data to save task', 'error');
      return;
    }

    this.saving.set(true);

    // Prepare request body based on edit restrictions
    const requestBody: EditTaskReq = this.onlyStatusEditable()
      ? { status: this.form.status }
      : {
          task_name: this.form.task_name,
          task_description: this.form.task_description,
          status: this.form.status,
          task_deadline: this.deadlineDate
            ? this.datePipe.transform(this.deadlineDate, 'yyyy-MM-dd') || undefined
            : undefined,
        };

    this.taskService.updateTask(projectId, currentTask.task_id, requestBody).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Task updated successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
        this.editing.set(false);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to update task';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.saving.set(false);
      }
    });
  }

  /**
   * Delete the current task
   */
  deleteTask(): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    const confirmed = confirm(`Are you sure you want to delete "${currentTask.task_name}"? This action cannot be undone.`);
    if (!confirmed) return;

    this.taskService.deleteTask(projectId, currentTask.task_id).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Task deleted successfully', 'success');
        this.goBack();
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to delete task';
        this.showSnackBar(errorMessage, 'error');
      }
    });
  }

  /**
   * Check if user is already a task member
   */
  isAlreadyTaskMember(userId: number | null): boolean {
    if (!userId) return false;

    const currentTask = this.task();
    return !!currentTask?.member_lists?.some(member => member.user_id === userId);
  }

  /**
   * Invite selected users to task
   */
  inviteToTask(): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask || !this.inviteUserIds.length) {
      this.showSnackBar('Please select users to invite', 'warning');
      return;
    }

    this.savingInvite.set(true);
    const payload = this.inviteUserIds.map(id => ({ user_id: id }));

    this.taskService.assignTaskMembers(projectId, currentTask.task_id, payload).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Members added to task successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
        this.inviteUserIds = [];
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to add members to task';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.savingInvite.set(false);
      }
    });
  }

  /**
   * Remove user from task
   */
  removeFromTask(userId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    this.removingUserId.set(userId);

    this.taskService.removeTaskMember(projectId, currentTask.task_id, userId).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Member removed from task successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to remove member from task';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.removingUserId.set(null);
      }
    });
  }

  /**
   * Check if current user can edit a specific comment
   */
  canEditComment(commentUserName: string): boolean {
    const currentUser = this.authService.currentUser();
    const currentTask = this.task();

    if (!currentTask || currentTask.status === 'COMPLETED') return false;

    // User can edit their own comments
    return !!currentUser && currentUser.user_name === commentUserName;
  }

  /**
   * Add a new comment to the task
   */
  addComment(): void {
    const projectId = this.projectId();
    const currentTask = this.task();
    const content = this.newCommentContent().trim();

    if (!projectId || !currentTask || !content) {
      this.showSnackBar('Please enter a comment', 'warning');
      return;
    }

    this.addingComment.set(true);

    this.taskService.addComment(projectId, currentTask.task_id, { content }).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Comment added successfully', 'success');
        this.newCommentContent.set('');
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to add comment';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.addingComment.set(false);
      }
    });
  }

  /**
   * Start editing a comment
   */
  startEditComment(commentId: number, currentContent: string): void {
    this.editingCommentId.set(commentId);
    this.editingCommentContent.set(currentContent);
  }

  /**
   * Cancel comment editing
   */
  cancelEditComment(): void {
    this.editingCommentId.set(null);
    this.editingCommentContent.set('');
  }

  /**
   * Save edited comment
   */
  saveEditComment(commentId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();
    const content = this.editingCommentContent().trim();

    if (!projectId || !currentTask || !content) {
      this.showSnackBar('Please enter comment content', 'warning');
      return;
    }

    this.taskService.updateComment(projectId, currentTask.task_id, commentId, { content }).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Comment updated successfully', 'success');
        this.cancelEditComment();
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to update comment';
        this.showSnackBar(errorMessage, 'error');
      }
    });
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    const confirmed = confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    this.taskService.deleteComment(projectId, currentTask.task_id, commentId).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Comment deleted successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to delete comment';
        this.showSnackBar(errorMessage, 'error');
      }
    });
  }

  /**
   * Add tag to task
   */
  addTagToTask(): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask || !this.selectedTagId) {
      this.showSnackBar('Please select a tag to add', 'warning');
      return;
    }

    this.tagging.set(true);

    this.taskService.addTagToTask(projectId, currentTask.task_id, this.selectedTagId).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Tag added successfully', 'success');
        this.selectedTagId = null;
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to add tag';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.tagging.set(false);
      }
    });
  }

  /**
   * Remove tag from task
   */
  removeTagFromTask(tagId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    this.tagging.set(true);

    this.taskService.removeTagFromTask(projectId, currentTask.task_id, tagId).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Tag removed successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to remove tag';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.tagging.set(false);
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
   * Show attachment details in a dialog
   */
  showAttachmentDetails(attachment: TaskAttachmentResp): void {
    this.dialog.open(AttachmentDetailsDialogComponent, {
      width: '600px',
      data: attachment
    });
  }

  /**
   * Handle file selection for upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.showSnackBar('File size must be less than 10MB', 'warning');
      input.value = '';
      return;
    }

    this.taskService.uploadTaskAttachment(projectId, currentTask.task_id, file).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'File uploaded successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
        input.value = '';
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to upload file';
        this.showSnackBar(errorMessage, 'error');
      }
    });
  }

  /**
   * Download attachment
   */
  download(attachmentId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    this.taskService.downloadAttachment(projectId, currentTask.task_id, attachmentId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Find attachment name
        const attachment = currentTask.task_attachments?.find(a => a.id === attachmentId);
        link.download = attachment?.file_name || `attachment-${attachmentId}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.showSnackBar('Failed to download file', 'error');
      }
    });
  }

  /**
   * Delete attachment
   */
  deleteAttachment(attachmentId: number): void {
    const projectId = this.projectId();
    const currentTask = this.task();

    if (!projectId || !currentTask) return;

    const confirmed = confirm('Are you sure you want to delete this attachment?');
    if (!confirmed) return;

    this.deletingId.set(attachmentId);

    this.taskService.deleteTaskAttachment(projectId, currentTask.task_id, attachmentId).subscribe({
      next: (response) => {
        this.showSnackBar(response.response_message || 'Attachment deleted successfully', 'success');
        this.loadTaskData(projectId, currentTask.task_id);
      },
      error: (error) => {
        const errorMessage = error?.error?.response_message || 'Failed to delete attachment';
        this.showSnackBar(errorMessage, 'error');
      },
      complete: () => {
        this.deletingId.set(null);
      }
    });
  }

  /**
   * Navigate back to project view
   */
  goBack(): void {
    const projectId = this.projectId();
    if (projectId) {
      this.router.navigate(['/projects', projectId]);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  /**
   * Show snack bar notification
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const config = {
      duration: type === 'error' ? 4000 : 2500,
      horizontalPosition: 'end' as const,
      verticalPosition: 'top' as const,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Track by function for ngFor performance optimization
   */
  trackByMemberId(index: number, member: any): number {
    return member.user_id;
  }

  trackByTagId(index: number, tag: any): number {
    return tag.tag_id;
  }

  trackByAttachmentId(index: number, attachment: any): number {
    return attachment.id;
  }

  trackByCommentId(index: number, comment: any): number {
    return comment.comment_id;
  }

  /**
   * Utility method to check if a string is empty or whitespace
   */
  private isEmpty(value: string | null | undefined): boolean {
    return !value || value.trim().length === 0;
  }

  /**
   * Get file size in human readable format
   */
  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if deadline is overdue
   */
  isOverdue(deadline?: string | null): boolean {
    if (!deadline) return false;

    const deadlineDate = new Date(deadline);
    const now = new Date();

    return deadlineDate < now;
  }

  /**
   * Get days remaining until deadline
   */
  getDaysUntilDeadline(deadline?: string | null): number {
    if (!deadline) return 0;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Format deadline status for display
   */
  getDeadlineStatus(deadline?: string | null): string {
    if (!deadline) return '';

    const days = this.getDaysUntilDeadline(deadline);

    if (days < 0) {
      return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    } else if (days === 0) {
      return 'Due today';
    } else if (days === 1) {
      return 'Due tomorrow';
    } else if (days <= 7) {
      return `Due in ${days} days`;
    } else {
      return `Due in ${days} days`;
    }
  }

  /**
   * Get CSS class for deadline status
   */
  getDeadlineClass(deadline?: string | null): string {
    if (!deadline) return '';

    const days = this.getDaysUntilDeadline(deadline);

    if (days < 0) {
      return 'deadline-overdue';
    } else if (days <= 1) {
      return 'deadline-urgent';
    } else if (days <= 7) {
      return 'deadline-warning';
    } else {
      return 'deadline-normal';
    }
  }

  /**
   * Validate form before submission
   */
  private validateForm(): boolean {
    if (this.isEmpty(this.form.task_name)) {
      this.showSnackBar('Task name is required', 'warning');
      return false;
    }

    if (this.form.task_name && this.form.task_name.length > 50) {
      this.showSnackBar('Task name must be 50 characters or less', 'warning');
      return false;
    }

    if (this.form.task_description && this.form.task_description.length > 250) {
      this.showSnackBar('Description must be 250 characters or less', 'warning');
      return false;
    }

    return true;
  }

  /**
   * Enhanced save method with validation
   */
  saveWithValidation(): void {
    if (!this.validateForm()) {
      return;
    }

    this.save();
  }

  /**
   * Get progress percentage for task
   */
  getTaskProgress(): number {
    const currentTask = this.task();
    if (!currentTask) return 0;

    switch (currentTask.status) {
      case 'PENDING': return 0;
      case 'IN_PROGRESS': return 50;
      case 'COMPLETED': return 100;
      default: return 0;
    }
  }

  /**
   * Get color for progress indicator
   */
  getProgressColor(): string {
    const currentTask = this.task();
    if (!currentTask) return 'primary';

    switch (currentTask.status) {
      case 'PENDING': return 'warn';
      case 'IN_PROGRESS': return 'accent';
      case 'COMPLETED': return 'primary';
      default: return 'primary';
    }
  }

  /**
   * Check if current user is task creator
   */
  isTaskCreator(): boolean {
    const currentUser = this.authService.currentUser();
    const currentTask = this.task();

    return !!currentUser && !!currentTask &&
           currentUser.user_name === currentTask.creator_name;
  }

  /**
   * Get member count display text
   */
  getMemberCountText(): string {
    const currentTask = this.task();
    const count = currentTask?.member_lists?.length || 0;

    return count === 1 ? '1 member' : `${count} members`;
  }

  /**
   * Get comment count display text
   */
  getCommentCountText(): string {
    const currentTask = this.task();
    const count = currentTask?.task_comments?.length || 0;

    return count === 1 ? '1 comment' : `${count} comments`;
  }

  /**
   * Get attachment count display text
   */
  getAttachmentCountText(): string {
    const currentTask = this.task();
    const count = currentTask?.task_attachments?.length || 0;

    return count === 1 ? '1 attachment' : `${count} attachments`;
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.editing() && !this.saving()) {
        this.saveWithValidation();
      }
    }

    // Escape to cancel editing
    if (event.key === 'Escape') {
      if (this.editing()) {
        this.toggleEdit();
      }
      if (this.editingCommentId()) {
        this.cancelEditComment();
      }
    }
  }
}
