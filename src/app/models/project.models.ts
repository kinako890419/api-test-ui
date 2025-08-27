// Common types
export type ProjStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type SortBy = 'createdAt' | 'updatedAt' | 'projectName';
export type Order = 'asc' | 'desc';
export type ProjectMemberRole = 'OWNER' | 'USER';

// Response interfaces
export interface ResponseMsg {
  status_type: string;
  response_message: string;
}

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

// Request interfaces
export interface ProjectQuery {
  sortBy?: SortBy;
  order?: Order;
  page?: number; // starts from 1
  pageSize?: number;
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

export interface ProjTagContentReq {
  tag_name: string;
}

export interface SetProjectMemberRoleRq {
  user_id: number;
  user_role: ProjectMemberRole | string;
}
