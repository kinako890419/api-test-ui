import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, LoginSuccess } from '../models/auth.models';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenSig = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private userSig = signal<LoginSuccess['user'] | null>(
    JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  );

  token = computed(() => this.tokenSig());
  currentUser = computed(() => this.userSig());
  isAuthenticated = computed(() => !!this.tokenSig());

  constructor(private http: HttpClient) {}

  login(body: LoginRequest) {
    const url = `${environment.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, body);
  }

  register(body: RegisterRequest) {
    const url = `${environment.apiBaseUrl}/auth/register`;
    return this.http.post<RegisterResponse>(url, body);
  }

  setSession(login: LoginSuccess) {
    localStorage.setItem(TOKEN_KEY, login.token);
    localStorage.setItem(USER_KEY, JSON.stringify(login.user));
    this.tokenSig.set(login.token);
    this.userSig.set(login.user);
  }

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSig.set(null);
    this.userSig.set(null);
  }
}