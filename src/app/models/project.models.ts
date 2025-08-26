export type ProjStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface ResponseMsg {
  status_type: string;
  response_message: string;
}
