import { spawn, ChildProcess } from 'child_process';
import type { VideoMetadata, PlaylistMetadata, PlaylistVideo } from '@/lib/types';
import { getYtdlpPath, getFfmpegPath, getOutputDir, ensureDir, getSettings, parseCustomOptions } from './settings';
import { eventBus } from './event-bus';
import { getQualityFormatString } from '@/lib/constants';
import path from 'path';

export interface MetadataResult {
  success: boolean;
  data?: VideoMetadata;
  error?: { code: string; message: string };
}

export interface PlaylistResult {
  success: boolean;
  data?: PlaylistMetadata;
  error?: { code: string; message: string };
}

export async function fetchMetadata(url: string): Promise<MetadataResult> {
  const ytdlp = getYtdlpPath();

  try {
    const proc = spawn(ytdlp, [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
      proc.on('close', resolve);
      proc.on('error', reject);
    });

    if (exitCode !== 0) {
      const errorMsg = stderr.trim() || 'Failed to fetch metadata';
      return {
        success: false,
        error: { code: 'METADATA_FAILED', message: errorMsg },
      };
    }

    const info = JSON.parse(stdout);

    const metadata: VideoMetadata = {
      id: info.id || '',
      title: info.title || 'Unknown',
      thumbnail: info.thumbnail || '',
      channel: info.channel || null,
      uploader: info.uploader || null,
      duration: info.duration || null,
      upload_date: info.upload_date || null,
      view_count: info.view_count || null,
      description: info.description || null,
      webpage_url: info.webpage_url || url,
      formats: (info.formats || []).map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || '',
        fps: f.fps || null,
        vcodec: f.vcodec || null,
        acodec: f.acodec || null,
        filesize: f.filesize || null,
        filesize_approx: f.filesize_approx || null,
        tbr: f.tbr || null,
        vbr: f.vbr || null,
        abr: f.abr || null,
        format_note: f.format_note || null,
        protocol: f.protocol || '',
      })),
      extractor: info.extractor || null,
      availability: info.availability || null,
    };

    eventBus.log('INFO', `Fetched metadata: ${metadata.title}`);
    return { success: true, data: metadata };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    eventBus.log('ERROR', `Metadata fetch failed: ${msg}`);
    return {
      success: false,
      error: { code: 'YTDLP_NOT_FOUND', message: `yt-dlp error: ${msg}` },
    };
  }
}

export async function fetchPlaylist(url: string): Promise<PlaylistResult> {
  const ytdlp = getYtdlpPath();

  try {
    const proc = spawn(ytdlp, [
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
      proc.on('close', resolve);
      proc.on('error', reject);
    });

    if (exitCode !== 0) {
      return {
        success: false,
        error: { code: 'PLAYLIST_FAILED', message: stderr.trim() || 'Failed to fetch playlist' },
      };
    }

    const lines = stdout.trim().split('\n').filter(Boolean);
    const videos: PlaylistVideo[] = [];
    let playlistTitle = 'Unknown Playlist';
    let playlistUploader: string | null = null;
    let playlistThumbnail: string | null = null;

    lines.forEach((line, idx) => {
      try {
        const entry = JSON.parse(line);
        if (idx === 0) {
          playlistTitle = entry.playlist_title || entry.title || 'Unknown Playlist';
          playlistUploader = entry.playlist_uploader || entry.uploader || null;
          playlistThumbnail = entry.thumbnails?.[0]?.url || entry.thumbnail || null;
        }
        videos.push({
          id: entry.id || `item-${idx}`,
          title: entry.title || `Video ${idx + 1}`,
          url: entry.url ? (entry.url.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`) : url,
          thumbnail: entry.thumbnails?.[0]?.url || entry.thumbnail || null,
          duration: entry.duration || null,
          uploader: entry.uploader || null,
          index: idx + 1,
        });
      } catch {
        // skip unparseable lines
      }
    });

    const metadata: PlaylistMetadata = {
      id: generateId(),
      title: playlistTitle,
      thumbnail: playlistThumbnail,
      uploader: playlistUploader,
      video_count: videos.length,
      total_duration: videos.reduce((sum, v) => sum + (v.duration || 0), 0) || null,
      videos,
    };

    eventBus.log('INFO', `Fetched playlist: ${metadata.title} (${videos.length} videos)`);
    return { success: true, data: metadata };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    eventBus.log('ERROR', `Playlist fetch failed: ${msg}`);
    return {
      success: false,
      error: { code: 'YTDLP_NOT_FOUND', message: `yt-dlp error: ${msg}` },
    };
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface DownloadOptions {
  id: string;
  url: string;
  type: 'video' | 'audio';
  format: string;
  quality: string;
  fps?: string;
  audioCodec?: string;
  audioBitrate?: string;
  embedThumbnail?: boolean;
  embedMetadata?: boolean;
  downloadSubtitles?: boolean;
  embedSubtitles?: boolean;
  subtitleLang?: string;
  filenameTemplate?: string;
  outputDir?: string;
  customOptions?: string;
  playlistIndex?: number;
  preserveNumbering?: boolean;
  renumberSelected?: boolean;
}

export interface DownloadHandle {
  process: ChildProcess | null;
  cancelled: boolean;
}

const activeDownloads = new Map<string, DownloadHandle>();

export function startDownload(
  options: DownloadOptions,
  onProgress: (progress: { percent: number; downloadedBytes: number; totalBytes: number; speed: number; eta: number; filename: string }) => void,
  onComplete: (filePath: string | null, error: string | null) => void
): DownloadHandle {
  const settings = getSettings();
  const ytdlp = getYtdlpPath();
  const ffmpegPath = getFfmpegPath();
  const outputDir = options.outputDir || getOutputDir();
  ensureDir(outputDir);

  const template = options.filenameTemplate || settings.filenameTemplate || '%(title)s.%(ext)s';

  const args: string[] = [
    '--no-warnings',
    '--no-playlist',
    '--newline',
    '--progress',
    '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(info.filename)s',
    '--ffmpeg-location', path.dirname(ffmpegPath) || '.',
    '-o', path.join(outputDir, template),
  ];

  // Format selection
  if (options.type === 'audio') {
    const audioFormat = options.format || 'mp3';
    args.push('-x', '--audio-format', audioFormat);
    if (options.audioBitrate && options.audioBitrate !== 'best') {
      args.push('--audio-quality', options.audioBitrate + 'K');
    }
  } else {
    // Video
    const qualityStr = getQualityFormatString(options.quality || 'best');
    args.push('-f', qualityStr);
    const container = options.format || 'mp4';
    if (container !== 'mp4') {
      args.push('--merge-output-format', container);
    } else {
      args.push('--merge-output-format', 'mp4');
    }
  }

  // Embed thumbnail
  if (options.embedThumbnail) {
    args.push('--embed-thumbnail');
  }

  // Embed metadata
  if (options.embedMetadata) {
    args.push('--embed-metadata');
  }

  // Subtitles
  if (options.downloadSubtitles) {
    args.push('--write-subs', '--sub-langs', options.subtitleLang || 'en');
    if (options.embedSubtitles) {
      args.push('--embed-subs');
    }
  }

  // Playlist index numbering
  if (options.playlistIndex != null) {
    const padded = String(options.playlistIndex).padStart(3, '0');
    args.push('-o', path.join(outputDir, `${padded} - %(title)s.%(ext)s`));
  }

  // Custom options (safe parsing)
  if (options.customOptions) {
    const custom = parseCustomOptions(options.customOptions);
    args.push(...custom);
  }

  // URL must be last
  args.push(options.url);

  eventBus.log('INFO', `Starting download: ${options.url}`, options.id);
  eventBus.log('DEBUG', `yt-dlp args: ${args.join(' ')}`, options.id);

  const handle: DownloadHandle = { process: null, cancelled: false };

  try {
    const proc = spawn(ytdlp, args, { cwd: outputDir });
    handle.process = proc;
    activeDownloads.set(options.id, handle);

    let lastProgressTime = 0;

    proc.stdout?.on('data', (data) => {
      const text = data.toString().trim();
      if (!text) return;

      // Parse progress: percent|speed|eta|downloaded_bytes|total_bytes|filename
      const parts = text.split('|');
      if (parts.length >= 6) {
        const percentStr = parts[0].replace('%', '').trim();
        const speedStr = parts[1].trim();
        const etaStr = parts[2].trim();
        const downloadedBytes = parseFloat(parts[3]) || 0;
        const totalBytes = parseFloat(parts[4]) || 0;
        const filename = parts[5].trim();

        const percent = parseFloat(percentStr) || 0;

        // Parse speed (e.g. "4.20Mi/s" -> bytes)
        const speed = parseSpeed(speedStr);
        // Parse eta (e.g. "00:32" -> seconds)
        const eta = parseEta(etaStr);

        const now = Date.now();
        if (now - lastProgressTime > 200) {
          lastProgressTime = now;
          onProgress({ percent, downloadedBytes, totalBytes, speed, eta, filename });
        }
      } else {
        eventBus.log('DOWNLOAD', text, options.id);
      }
    });

    proc.stderr?.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        if (text.includes('ffmpeg') || text.includes('FFmpeg')) {
          eventBus.log('FFMPEG', text, options.id);
        } else if (text.includes('WARNING') || text.includes('warning')) {
          eventBus.log('WARNING', text, options.id);
        } else {
          eventBus.log('DEBUG', text, options.id);
        }
      }
    });

    proc.on('close', (code) => {
      activeDownloads.delete(options.id);
      if (handle.cancelled) {
        eventBus.log('INFO', `Download cancelled: ${options.url}`, options.id);
        onComplete(null, 'Download cancelled');
        return;
      }
      if (code === 0) {
        eventBus.log('SUCCESS', `Download completed: ${options.url}`, options.id);
        onComplete(null, null);
      } else {
        const errMsg = `yt-dlp exited with code ${code}`;
        eventBus.log('ERROR', `Download failed: ${errMsg}`, options.id);
        onComplete(null, errMsg);
      }
    });

    proc.on('error', (err) => {
      activeDownloads.delete(options.id);
      const msg = err.message.includes('ENOENT')
        ? 'yt-dlp not found. Please install yt-dlp or configure its path in Settings.'
        : err.message;
      eventBus.log('ERROR', `Download error: ${msg}`, options.id);
      onComplete(null, msg);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    eventBus.log('ERROR', `Failed to start download: ${msg}`, options.id);
    onComplete(null, msg);
  }

  return handle;
}

export function cancelDownload(id: string): boolean {
  const handle = activeDownloads.get(id);
  if (!handle || !handle.process) return false;
  handle.cancelled = true;
  try {
    handle.process.kill('SIGTERM');
    return true;
  } catch {
    return false;
  }
}

export function pauseDownload(id: string): boolean {
  const handle = activeDownloads.get(id);
  if (!handle || !handle.process) return false;
  try {
    handle.process.kill('SIGSTOP');
    return true;
  } catch {
    return false;
  }
}

export function resumeDownload(id: string): boolean {
  const handle = activeDownloads.get(id);
  if (!handle || !handle.process) return false;
  try {
    handle.process.kill('SIGCONT');
    return true;
  } catch {
    return false;
  }
}

function parseSpeed(str: string): number {
  // Parse strings like "4.20Mi/s", "1.50Ki/s", "0.00B/s"
  const match = str.match(/([\d.]+)(\w+)/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    'b/s': 1,
    'ki/s': 1024,
    'mi/s': 1024 * 1024,
    'gi/s': 1024 * 1024 * 1024,
    'kib/s': 1024,
    'mib/s': 1024 * 1024,
    'gib/s': 1024 * 1024 * 1024,
    'kb/s': 1024,
    'mb/s': 1024 * 1024,
    'gb/s': 1024 * 1024 * 1024,
  };
  return value * (multipliers[unit] || 1);
}

function parseEta(str: string): number {
  // Parse strings like "00:32", "01:23:45"
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
