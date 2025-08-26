import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { ProjStatus, ResponseMsg } from '../models/project.models';

export type SortBy = 'createdAt' | 'updatedAt' | 'projectName';
export type Order = 'asc' | 'desc';

export interface ProjectUserDetailsResp {
  user_id: number;
  user_email: string;
  user_name: string;
  user_project_role: string;
  invited_by?: string;
}

export interface ProjDetailsResp {
  project_id: number;
  creator_id: number;
  creator_name: string;
  project_name: string;
  project_description?: string;
  project_status?: ProjStatus;
  member_list?: ProjectUserDetailsResp[];
  project_created_time?: string;
  project_updated_time?: string;
}

export interface TagsResp {
  tag_id: number;
  tag_name: string;
  creator?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTagsListResp {
  project_id: number;
  tags: TagsResp[];
}

export interface ProjTagContentReq {
  tag_name: string; // <= 10 chars per backend schema
}

export interface ProjectQuery {
  sortBy?: SortBy;
  order?: Order;
  page?: number; // starts from 1
  pageSize?: number; // default 5
  status?: ProjStatus;
}

export interface EditProjectReq {
  project_name?: string;
  project_description?: string;
  project_status?: ProjStatus;
}

export interface CreateProjectReq {
  project_name: string;
  project_description?: string;
  project_status?: ProjStatus;
}

export type ProjectMemberRole = 'OWNER' | 'USER';

export interface SetProjectMemberRoleRq {
  user_id: number;
  user_role: ProjectMemberRole | string; // backend ignores case; keep string for flexibility
}

// Task-related interfaces moved to TaskService

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);

  list(query: ProjectQuery = {}): Observable<ProjDetailsResp[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ProjDetailsResp[]>(`${environment.apiBaseUrl}/projects`, { params });
  }

  getById(id: number): Observable<ProjDetailsResp> {
    return this.http.get<ProjDetailsResp>(`${environment.apiBaseUrl}/projects/${id}`);
  }

  update(id: number, updates: EditProjectReq): Observable<ResponseMsg> {
    return this.http.patch<ResponseMsg>(`${environment.apiBaseUrl}/projects/${id}`, updates);
  }

  create(project: CreateProjectReq): Observable<ResponseMsg> {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects`, project);
  }

  delete(id: number): Observable<ResponseMsg> {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${id}`);
  }

  /**
   * Project Members APIs
   */
  inviteMembers(projectId: number, payload: SetProjectMemberRoleRq[]): Observable<ResponseMsg> {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users`, payload);
  }

  setMemberRole(projectId: number, payload: SetProjectMemberRoleRq): Observable<ResponseMsg> {
    return this.http.patch<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users`, payload);
  }

  removeMember(projectId: number, userId: number): Observable<ResponseMsg> {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/users/${userId}`);
  }

  // Task CRUD moved to TaskService

  /**
   * Project Tags APIs
   */
  getProjectTags(projectId: number): Observable<ProjectTagsListResp> {
    return this.http.get<ProjectTagsListResp>(`${environment.apiBaseUrl}/projects/${projectId}/tags`);
  }

  addProjectTag(projectId: number, body: ProjTagContentReq): Observable<ResponseMsg> {
    return this.http.post<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags`, body);
  }

  editProjectTag(projectId: number, tagId: number, body: ProjTagContentReq): Observable<ResponseMsg> {
    return this.http.put<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags/${tagId}`, body);
  }

  deleteProjectTag(projectId: number, tagId: number): Observable<ResponseMsg> {
    return this.http.delete<ResponseMsg>(`${environment.apiBaseUrl}/projects/${projectId}/tags/${tagId}`);
  }
}
