export interface VideoItem {
  id: string;
  title: string;
  filename?: string;
  thumbnail?: string;
  thumbnails_base?: string;
  duration?: number;
  uploader?: string;
  status?: string;
  video_url?: string; // MUST EXIST
  url?: string;
  created_at?: string | null;
}

// VideoMeta — used by VideoPlayer
export interface VideoMeta extends VideoItem {
  poster?: string;
}
