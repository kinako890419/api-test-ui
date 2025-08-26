import type { ProjStatus } from './project.models';

export type Order = 'asc' | 'desc';

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

export interface TagsResp {
  tag_id: number;
  tag_name: string;
  creator?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskAttachmentResp {
  id: number;
  file_name: string;
  content_path: string;
  creator_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskCommentResp {
  comment_id: number;
  user_name: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommentContentReq {
  content: string;
}

export interface TaskDetailResp {
  task_id: number;
  task_name: string;
  description?: string;
  creator_name: string;
  status: ProjStatus;
  created_at?: string;
  member_lists?: TaskUserDetailsResp[];
  task_attachments?: TaskAttachmentResp[];
  task_comments?: TaskCommentResp[];
  tags?: TagsResp[];
  updated_at?: string;
  deadline?: string;
  is_editable?: boolean;
}

export interface AddNewTaskReq {
  task_name: string;
  task_description?: string;
  task_status?: ProjStatus | string;
  task_deadline: string; // yyyy-MM-dd
}

export interface EditTaskReq {
  task_name?: string;
  task_description?: string;
  status?: ProjStatus | string;
  task_deadline?: string; // yyyy-MM-dd or ISO accepted by backend
}
