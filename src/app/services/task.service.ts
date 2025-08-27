import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResponseMsg } from '../models/project.models';
import {
  AddNewTaskReq,
  CommentContentReq,
  EditTaskReq,
  TaskDetailResp,
  TaskQuery,
  ViewAllTaskResp,
} from '../models/task.models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  getProjectTasks(projectId: number, query: TaskQuery = {}) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ViewAllTaskResp>(`${environment.apiBaseUrl}/projects/${projectId}/tasks`, { params });
  }

  getTaskById(projectId: number, taskId: number) {
    return this.http.get<TaskDetailResp>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}`);
  }

  addTask(projectId: number, body: AddNewTaskReq) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks`, body);
  }

  updateTask(projectId: number, taskId: number, body: EditTaskReq) {
    return this.http.patch<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}`, body);
  }

  deleteTask(projectId: number, taskId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}`);
  }

  downloadAttachment(projectId: number, taskId: number, attachmentId: number) {
    return this.http.get(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
      { responseType: 'blob' as 'json' }) as unknown as Observable<Blob>;
  }

  uploadTaskAttachment(projectId: number, taskId: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/attachments`, form);
  }

  deleteTaskAttachment(projectId: number, taskId: number, attachmentId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
  }

  assignTaskMembers(projectId: number, taskId: number, users: { user_id: number }[]) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/users`, users);
  }

  removeTaskMember(projectId: number, taskId: number, userId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/users/${userId}`);
  }

  // Comments CRUD
  addComment(projectId: number, taskId: number, body: CommentContentReq) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/comments`, body);
  }

  updateComment(projectId: number, taskId: number, commentId: number, body: CommentContentReq) {
    return this.http.put<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, body);
  }

  deleteComment(projectId: number, taskId: number, commentId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
  }

  // Task Tags mapping
  addTagToTask(projectId: number, taskId: number, tagId: number) {
    // Backend is expected to accept { tag_id } as the body
    return this.http.post<ResponseMsg>(
      `${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/tags`,
      { tag_id: tagId }
    );
  }

  removeTagFromTask(projectId: number, taskId: number, tagId: number) {
    return this.http.delete<ResponseMsg>(
      `${environment.apiBaseUrl}/projects/${projectId}/tasks/${taskId}/tags/${tagId}`
    );
  }
}
