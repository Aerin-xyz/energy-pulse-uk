export interface LinkedInPostPayload {
  post_id: string;
  channel: 'linkedin';
  post_type: string;
  text: string;
  image_path: string | null;
  schedule_time: string | null; // ISO8601 UTC
  mode: 'now' | 'schedule';
}
