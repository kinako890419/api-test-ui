import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, LoginSuccess } from '../models/auth.models';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenSig = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  private userSig = signal<LoginSuccess['user'] | null>(
    JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
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
  // localStorage: 一個瀏覽器存放一個，多個tab共用，直到手動清除才會登出(如果沒過期)
  // sessionStorage: 每個tab各自存放，關閉tab後自動登出
    sessionStorage.setItem(TOKEN_KEY, login.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(login.user));
    this.tokenSig.set(login.token);
    this.userSig.set(login.user);
  }

  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.tokenSig.set(null);
    this.userSig.set(null);
  }
}
