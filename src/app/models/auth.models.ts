// Request DTOs
export interface LoginRequest {
  user_mail: string;
  user_password: string;
}

export interface RegisterRequest {
  user_name: string;
  password: string;
  email: string;
}

// Success responses
export interface LoginSuccess {
  token: string;
  user: {
    user_id: number;
    user_email: string;
    user_name: string;
    user_role: string;
    created_at: string;
    updated_at: string;
  };
}

export interface RegisterSuccess {
  status_type: 'success';
  response_message: string;
}

// Failure response (shared shape)
export interface FailResponse {
  status_type: 'fail';
  response_message: string;
}

export type LoginResponse = LoginSuccess | FailResponse;
export type RegisterResponse = RegisterSuccess | FailResponse;
