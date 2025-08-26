import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProjectService, ProjectUserDetailsResp } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { TaskDetailResp, EditTaskReq, TagsResp } from '../../models/task.models';
import { ProjStatus } from '../../models/project.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  FormsModule,
  MatDatepickerModule,
  MatNativeDateModule,
  ],
  providers: [DatePipe],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.css']
})
export class TaskDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ProjectService);
  private taskSvc = inject(TaskService);
  private auth = inject(AuthService);
  private date = inject(DatePipe);
  private snack = inject(MatSnackBar);

  loading = signal(false);
  error = signal('');
  task = signal<TaskDetailResp | null>(null);
  projectId = signal<number | null>(null);
  uploading = signal(false);
  deletingId = signal<number | null>(null);
  editing = signal(false);
  saving = signal(false);
  form: EditTaskReq = {};
  // Material datepicker model for editing deadline
  deadlineDate: Date | null = null;
  projectMembers = signal<ProjectUserDetailsResp[]>([]);
  inviteUserIds: number[] = [];
  savingInvite = signal(false);
  removingUserId = signal<number | null>(null);
  // Comments state
  addingComment = signal(false);
  newCommentContent = signal<string>('');
  editingCommentId = signal<number | null>(null);
  editingCommentContent = signal<string>('');
  // Tags state
  projectTags = signal<TagsResp[]>([]);
  selectedTagId: number | null = null;
  tagging = signal(false);

  ngOnInit() {
    const pid = Number(this.route.snapshot.paramMap.get('id'));
    const tid = Number(this.route.snapshot.paramMap.get('taskId'));
    if (!pid || !tid) {
      this.error.set('Invalid project or task id');
      return;
    }
    this.projectId.set(pid);
    this.fetch(pid, tid);
    // preload project members for selection
    this.svc.getById(pid).subscribe({
      next: (proj) => this.projectMembers.set(proj.member_list || []),
      error: () => {}
    });
    // preload project tags for selection
    this.svc.getProjectTags(pid).subscribe({
      next: (res) => this.projectTags.set(res.tags || []),
      error: () => {}
    });
  }

  fetch(projectId: number, taskId: number) {
    this.loading.set(true);
    this.error.set('');
    this.taskSvc.getTaskById(projectId, taskId).subscribe({
      next: (t) => {
        this.task.set(t);
  this.form = {
          task_name: t.task_name,
          task_description: t.description,
          status: t.status,
          task_deadline: t.deadline ? t.deadline.substring(0, 10) : undefined,
        };
  this.deadlineDate = t.deadline ? new Date(t.deadline) : null;
      },
      error: (err) => this.error.set(err?.error?.response_message || 'Failed to load task'),
      complete: () => this.loading.set(false),
    });
  }

  format(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    try { return this.date.transform(dateStr, 'MMM d, y, HH:mm') || 'N/A'; } catch { return 'N/A'; }
  }

  toggleEdit() { this.editing.set(!this.editing()); }

  save() {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.saving.set(true);
    // If task is COMPLETED, only send status to backend
    const body: EditTaskReq = this.onlyStatusEditable()
      ? { status: this.form.status }
      : {
          task_name: this.form.task_name,
          task_description: this.form.task_description,
          status: this.form.status,
          task_deadline: this.deadlineDate ? (this.date.transform(this.deadlineDate, 'yyyy-MM-dd') || undefined) : undefined,
        };
    this.taskSvc.updateTask(pid, t.task_id, body).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Updated', 'Close', { duration: 2500 });
        this.fetch(pid, t.task_id);
        this.editing.set(false);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Update failed', 'Close', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  deleteTask() {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    if (!confirm('Delete this task?')) return;
    this.taskSvc.deleteTask(pid, t.task_id).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Task deleted', 'Close', { duration: 2500 });
        this.goBack();
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Delete failed', 'Close', { duration: 3000 })
    });
  }

  // When task is COMPLETED, allow only status to change
  onlyStatusEditable(): boolean {
    const t = this.task();
    return (t?.status === 'COMPLETED');
  }

  // Task member management
  canManageTaskMembers(): boolean {
    const t = this.task();
    if (!t || t.status === 'COMPLETED') return false;
    // project owners or task members can manage per API; backend enforces; UI shows to any member for convenience
    return true;
  }

  isAlreadyTaskMember(userId: number | null): boolean {
    if (!userId) return false;
    const t = this.task();
    return !!t?.member_lists?.some(m => m.user_id === userId);
  }

  inviteToTask() {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t || !this.inviteUserIds || this.inviteUserIds.length === 0) return;
    this.savingInvite.set(true);
    const payload = this.inviteUserIds.map(id => ({ user_id: id }));
    this.taskSvc.assignTaskMembers(pid, t.task_id, payload).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Member added to task', 'Close', { duration: 2500 });
        this.fetch(pid, t.task_id);
        this.inviteUserIds = [];
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to add member', 'Close', { duration: 3000 }),
      complete: () => this.savingInvite.set(false)
    });
  }

  removeFromTask(userId: number) {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.removingUserId.set(userId);
    this.taskSvc.removeTaskMember(pid, t.task_id, userId).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Member removed from task', 'Close', { duration: 2500 });
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to remove member', 'Close', { duration: 3000 }),
      complete: () => this.removingUserId.set(null)
    });
  }

  // Comments permissions (UI hints only; backend enforces)
  canAddComment(): boolean {
    const t = this.task();
    return !!t && t.status !== 'COMPLETED';
  }

  canEditComment(commentUserName: string): boolean {
    const user = this.auth.currentUser();
    const t = this.task();
    if (!t || t.status === 'COMPLETED') return false;
    // Heuristic: allow edit if current user name matches comment user name
    return !!user && user.user_name === commentUserName;
  }

  addComment() {
    const pid = this.projectId();
    const t = this.task();
    const content = this.newCommentContent().trim();
    if (!pid || !t || !content) return;
    this.taskSvc.addComment(pid, t.task_id, { content }).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Comment added', 'Close', { duration: 2000 });
        this.newCommentContent.set('');
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to add comment', 'Close', { duration: 3000 })
    });
  }

  startEditComment(commentId: number, current: string) {
    this.editingCommentId.set(commentId);
    this.editingCommentContent.set(current);
  }

  cancelEditComment() {
    this.editingCommentId.set(null);
    this.editingCommentContent.set('');
  }

  saveEditComment(commentId: number) {
    const pid = this.projectId();
    const t = this.task();
    const content = this.editingCommentContent().trim();
    if (!pid || !t || !content) return;
    this.taskSvc.updateComment(pid, t.task_id, commentId, { content }).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Comment updated', 'Close', { duration: 2000 });
        this.cancelEditComment();
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to update comment', 'Close', { duration: 3000 })
    });
  }

  deleteComment(commentId: number) {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.taskSvc.deleteComment(pid, t.task_id, commentId).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Comment deleted', 'Close', { duration: 2000 });
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to delete comment', 'Close', { duration: 3000 })
    });
  }

  statusIcon(status?: ProjStatus): string {
    switch (status) {
      case 'PENDING': return 'schedule';
      case 'IN_PROGRESS': return 'work';
      case 'COMPLETED': return 'check_circle';
      default: return 'help_outline';
    }
  }

  download(attId: number) {
    const pid = this.projectId();
    const task = this.task();
    if (!pid || !task) return;
    this.taskSvc.downloadAttachment(pid, task.task_id, attId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const att = task.task_attachments?.find(a => a.id === attId);
        a.download = att?.file_name || `attachment-${attId}`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snack.open('Download failed', 'Close', { duration: 2500 })
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.uploading.set(true);
    this.taskSvc.uploadTaskAttachment(pid, t.task_id, file).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Uploaded', 'Close', { duration: 2500 });
        this.fetch(pid, t.task_id);
        input.value = '';
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Upload failed', 'Close', { duration: 3000 }),
      complete: () => this.uploading.set(false)
    });
  }

  deleteAttachment(id: number) {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.deletingId.set(id);
    this.taskSvc.deleteTaskAttachment(pid, t.task_id, id).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Deleted', 'Close', { duration: 2500 });
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Delete failed', 'Close', { duration: 3000 }),
      complete: () => this.deletingId.set(null)
    });
  }

  goBack() {
    const pid = this.projectId();
    if (pid) this.router.navigate(['/projects', pid]);
  }

  // Task Tags operations
  canManageTags(): boolean {
    const t = this.task();
    return !!t && t.status !== 'COMPLETED';
  }

  availableProjectTags(): TagsResp[] {
    const t = this.task();
    const existingIds = new Set((t?.tags || []).map(tag => tag.tag_id));
    return (this.projectTags() || []).filter(tag => !existingIds.has(tag.tag_id));
  }

  addTagToTask() {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t || !this.selectedTagId) return;
    this.tagging.set(true);
    this.taskSvc.addTagToTask(pid, t.task_id, this.selectedTagId).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Tag added', 'Close', { duration: 2000 });
        this.selectedTagId = null;
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to add tag', 'Close', { duration: 3000 }),
      complete: () => this.tagging.set(false)
    });
  }

  removeTagFromTask(tagId: number) {
    const pid = this.projectId();
    const t = this.task();
    if (!pid || !t) return;
    this.tagging.set(true);
    this.taskSvc.removeTagFromTask(pid, t.task_id, tagId).subscribe({
      next: (res) => {
        this.snack.open(res.response_message || 'Tag removed', 'Close', { duration: 2000 });
        this.fetch(pid, t.task_id);
      },
      error: (err) => this.snack.open(err?.error?.response_message || 'Failed to remove tag', 'Close', { duration: 3000 }),
      complete: () => this.tagging.set(false)
    });
  }
}
