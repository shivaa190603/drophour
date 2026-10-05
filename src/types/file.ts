export type ShareStatus = 'active' | 'expired' | 'deleted';

export interface FileShare {
  id: string;
  share_token: string;
  share_code: string;
  delete_token: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  expires_at: string;
  status: ShareStatus;
  download_count: number;
  last_downloaded_at?: string | null;
  database_instance_id?: string;
  payment_status?: 'free' | 'paid';
  amount_paid_inr?: number;
}

export interface ShareMetadata {
  share_token: string;
  share_code: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  expires_at: string;
  status: ShareStatus;
  download_count: number;
  database_instance_id?: string;
}

export interface CreateShareResponse {
  share_token: string;
  share_code: string;
  delete_token: string;
  expires_at: string;
  file_size: number;
  original_filename: string;
  database_instance_id?: string;
}

export interface DownloadResponse {
  download_url: string;
  filename: string;
  expires_at: string;
}

export type UploadStage =
  | 'idle'
  | 'selected'
  | 'awaiting_payment'
  | 'uploading'
  | 'securing'
  | 'completed'
  | 'error';

export interface UploadProgress {
  stage: UploadStage;
  progressPercent: number;
  errorMessage?: string;
  result?: CreateShareResponse;
}
