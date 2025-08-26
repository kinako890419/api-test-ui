import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfileResp {
  user_id: number;
  user_email: string;
  user_name: string;
  user_role: string; // global role: USER | ADMIN
  created_at?: string;
  updated_at?: string;
}

export interface EditUserInfoReq {
  user_name?: string;
  user_email?: string;
  is_admin?: boolean; // ADMIN may change role; normal user ignores this
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getAll(isDeleted?: string): Observable<UserProfileResp[]> {
    let params = new HttpParams();
    if (isDeleted !== undefined) params = params.set('isDeleted', isDeleted);
    return this.http.get<UserProfileResp[]>(`${environment.apiBaseUrl}/users`, { params });
  }

  getById(id: number): Observable<UserProfileResp> {
    return this.http.get<UserProfileResp>(`${environment.apiBaseUrl}/users/${id}`);
  }

  delete(id: number) {
    return this.http.delete(`${environment.apiBaseUrl}/users/${id}`);
  }

  edit(id: number, body: EditUserInfoReq) {
    return this.http.patch(`${environment.apiBaseUrl}/users/${id}`, body);
  }
}
