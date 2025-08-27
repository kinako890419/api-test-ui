// User interfaces
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
