import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  ProjStatus,
  ResponseMsg,
  SortBy,
  Order,
  ProjectUserDetailsResp,
  ProjDetailsResp,
  TagsResp,
  ProjectTagsListResp,
  ProjTagContentReq,
  ProjectQuery,
  EditProjectReq,
  CreateProjectReq,
  ProjectMemberRole,
  SetProjectMemberRoleRq
} from '../models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);

  list(query: ProjectQuery = {}) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ProjDetailsResp[]>(`${environment.apiBaseUrl}/projects`, { params });
  }

  getById(id: number) {
    return this.http.get<ProjDetailsResp>(`${environment.apiBaseUrl}/projects/${id}`);
  }

  update(id: number, updates: EditProjectReq) {
    return this.http.patch<ResponseMsg>(`${environment.apiBaseUrl}/projects/${id}`, updates);
  }

  create(project: CreateProjectReq) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects`, project);
  }

  delete(id: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${id}`);
  }

  /**
   * Project Members APIs
   */
  inviteMembers(projectId: number, payload: SetProjectMemberRoleRq[]) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users`, payload);
  }

  setMemberRole(projectId: number, payload: SetProjectMemberRoleRq) {
    return this.http.patch<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users`, payload);
  }

  removeMember(projectId: number, userId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users/${userId}`);
  }

  // Task CRUD moved to TaskService

  /**
   * Project Tags APIs
   */
  getProjectTags(projectId: number) {
    return this.http.get<ProjectTagsListResp>(`${environment.apiBaseUrl}/projects/${projectId}/tags`);
  }

  addProjectTag(projectId: number, body: ProjTagContentReq) {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags`, body);
  }

  editProjectTag(projectId: number, tagId: number, body: ProjTagContentReq) {
    return this.http.put<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags/${tagId}`, body);
  }

  deleteProjectTag(projectId: number, tagId: number) {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags/${tagId}`);
  }
}
