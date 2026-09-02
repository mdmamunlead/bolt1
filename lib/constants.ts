import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  startupBehavior: 'dashboard',
  confirmDelete: true,
  autoDetectDeps: true,
  autoRefresh: true,

  outputFolder: '',
  tempDir: '',
  concurrentDownloads: 2,
  autoStartQueue: true,
  retryFailed: true,
  maxRetries: 3,
  filenameTemplate: '%(title)s.%(ext)s',

  defaultVideoFormat: 'mp4',
  defaultVideoQuality: '1080p',
  defaultVideoCodec: 'auto',
  defaultFps: 'original',

  defaultAudioFormat: 'mp3',
  defaultAudioBitrate: '320',
  defaultAudioCodec: 'auto',

  defaultSelectionMode: 'entire',
  rememberLastRange: true,
  defaultZipSetting: false,
  preserveNumbering: true,
  renumberSelected: false,

  downloadSubtitles: false,
  embedSubtitles: false,
  subtitleLang: 'en',

  theme: 'dark',
  accentColor: 'blue',
  sidebarStyle: 'expanded',
  compactMode: false,
  uiDensity: 'comfortable',
  borderRadius: 0.5,
  animationIntensity: 'subtle',

  ytdlpPath: '',
  ffmpegPath: '',
  ffprobePath: '',
};

export const VIDEO_FORMATS = ['mp4', 'mkv', 'webm', 'mov'];
export const VIDEO_QUALITIES = [
  'best',
  '2160p',
  '1440p',
  '1080p',
  '720p',
  '480p',
  '360p',
  'custom',
];
export const FPS_OPTIONS = ['original', '24', '30', '60', 'highest'];
export const AUDIO_CODECS = ['best', 'aac', 'm4a', 'mp3', 'opus', 'wav'];
export const AUDIO_BITRATES = ['best', '320', '256', '192', '128', 'custom'];
export const AUDIO_FORMATS = ['mp3', 'm4a', 'aac', 'opus', 'wav', 'flac'];

export function getQualityFormatString(quality: string): string {
  const map: Record<string, string> = {
    best: 'bestvideo+bestaudio/best',
    '2160p': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    '1440p': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
  };
  return map[quality] || 'best';
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function formatTimeShort(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
