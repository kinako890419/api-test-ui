import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type SortBy = 'createdAt' | 'updatedAt' | 'projectName';
export type Order = 'asc' | 'desc';
export type ProjStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

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

export interface ResponseMsg {
  status_type: string;
  response_message: string;
}

export interface TaskUserDetailsResp {
  user_id: number;
  user_email: string;
  user_name: string;
  invited_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskListResp {
  task_id: number;
  task_name: string;
  creator: string;
  task_description?: string;
  status?: ProjStatus;
  task_deadline?: string;
  member_list?: TaskUserDetailsResp[];
  created_at?: string;
  updated_at?: string;
  is_editable?: boolean;
}

export interface ViewAllTaskResp {
  project_id: number;
  tasks_list: TaskListResp[];
}

export interface TaskQuery {
  status?: ProjStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'taskName';
  order?: Order;
}

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

  getProjectTasks(projectId: number, query: TaskQuery = {}): Observable<ViewAllTaskResp> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ViewAllTaskResp>(`${environment.apiBaseUrl}/projects/${projectId}/tasks`, { params });
  }
}
