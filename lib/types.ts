export type DownloadType = 'video' | 'audio' | 'playlist' | 'zip';
export type DownloadStatus =
  | 'waiting'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export type LogLevel = 'INFO' | 'DEBUG' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'DOWNLOAD' | 'FFMPEG';

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
  filesize: number | null;
  filesize_approx: number | null;
  tbr: number | null;
  vbr: number | null;
  abr: number | null;
  format_note: string | null;
  protocol: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channel: string | null;
  uploader: string | null;
  duration: number | null;
  upload_date: string | null;
  view_count: number | null;
  description: string | null;
  webpage_url: string;
  formats: VideoFormat[];
  extractor: string | null;
  availability: string | null;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  index: number;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  thumbnail: string | null;
  uploader: string | null;
  video_count: number;
  total_duration: number | null;
  videos: PlaylistVideo[];
}

export interface DownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number;
  filename: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  type: DownloadType;
  format: string;
  quality: string;
  status: DownloadStatus;
  progress: number;
  speed: number;
  eta: number;
  fileSize: number;
  downloadedBytes: number;
  totalBytes: number;
  playlistIndex: number | null;
  playlistId: string | null;
  outputDir: string;
  filename: string;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  downloadSubtitles: boolean;
  embedSubtitles: boolean;
  subtitleLang: string;
  audioCodec: string;
  audioBitrate: string;
  fps: string;
  isZip: boolean;
  zipItems?: string[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  downloadId: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type SelectionMode = 'entire' | 'range' | 'individual' | 'custom';

export interface Settings {
  // General
  startupBehavior: 'dashboard' | 'queue' | 'last';
  confirmDelete: boolean;
  autoDetectDeps: boolean;
  autoRefresh: boolean;

  // Download
  outputFolder: string;
  tempDir: string;
  concurrentDownloads: number;
  autoStartQueue: boolean;
  retryFailed: boolean;
  maxRetries: number;
  filenameTemplate: string;

  // Video defaults
  defaultVideoFormat: string;
  defaultVideoQuality: string;
  defaultVideoCodec: string;
  defaultFps: string;

  // Audio defaults
  defaultAudioFormat: string;
  defaultAudioBitrate: string;
  defaultAudioCodec: string;

  // Playlist defaults
  defaultSelectionMode: SelectionMode;
  rememberLastRange: boolean;
  defaultZipSetting: boolean;
  preserveNumbering: boolean;
  renumberSelected: boolean;

  // Subtitles
  downloadSubtitles: boolean;
  embedSubtitles: boolean;
  subtitleLang: string;

  // Appearance
  theme: ThemeMode;
  accentColor: string;
  sidebarStyle: 'expanded' | 'compact';
  compactMode: boolean;
  uiDensity: 'comfortable' | 'compact';
  borderRadius: number;
  animationIntensity: 'none' | 'subtle' | 'full';

  // Dependencies
  ytdlpPath: string;
  ffmpegPath: string;
  ffprobePath: string;
}

export interface DependencyInfo {
  name: string;
  found: boolean;
  version: string | null;
  path: string | null;
}

export interface SystemStatus {
  uptime: number;
  activeDownloads: number;
  queuedDownloads: number;
  totalDownloads: number;
  totalDownloadedBytes: number;
  diskSpace: { available: number; total: number } | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
