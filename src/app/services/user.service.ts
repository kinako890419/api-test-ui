import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UserProfileResp, EditUserInfoReq } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getAll(isDeleted?: string) {
    let params = new HttpParams();
    if (isDeleted !== undefined) params = params.set('isDeleted', isDeleted);
    return this.http.get<UserProfileResp[]>(`${environment.apiBaseUrl}/users`, { params });
  }

  getById(id: number) {
    return this.http.get<UserProfileResp>(`${environment.apiBaseUrl}/users/${id}`);
  }

  delete(id: number) {
    return this.http.delete(`${environment.apiBaseUrl}/users/${id}`);
  }

  edit(id: number, body: EditUserInfoReq) {
    return this.http.patch(`${environment.apiBaseUrl}/users/${id}`, body);
  }
}
