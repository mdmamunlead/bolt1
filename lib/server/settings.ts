import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import type { DependencyInfo, Settings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { eventBus } from './event-bus';

const execFileAsync = promisify(execFile);

const SETTINGS_FILE = path.join(process.cwd(), '.downloader-settings.json');
const HISTORY_FILE = path.join(process.cwd(), '.downloader-history.json');

let cachedSettings: Settings | null = null;

export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return cachedSettings;
}

export function saveSettings(settings: Settings): void {
  cachedSettings = { ...settings };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    eventBus.log('ERROR', `Failed to save settings: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function getYtdlpPath(): string {
  const settings = getSettings();
  if (settings.ytdlpPath && fs.existsSync(settings.ytdlpPath)) {
    return settings.ytdlpPath;
  }
  return 'yt-dlp';
}

export function getFfmpegPath(): string {
  const settings = getSettings();
  if (settings.ffmpegPath && fs.existsSync(settings.ffmpegPath)) {
    return settings.ffmpegPath;
  }
  return 'ffmpeg';
}

export function getFfprobePath(): string {
  const settings = getSettings();
  if (settings.ffprobePath && fs.existsSync(settings.ffprobePath)) {
    return settings.ffprobePath;
  }
  return 'ffprobe';
}

export async function detectDependencies(): Promise<DependencyInfo[]> {
  const deps: DependencyInfo[] = [];

  // yt-dlp
  const ytdlpInfo = await checkDependency(getYtdlpPath(), ['--version']);
  deps.push({
    name: 'yt-dlp',
    found: ytdlpInfo.found,
    version: ytdlpInfo.version,
    path: ytdlpInfo.path,
  });

  // ffmpeg
  const ffmpegInfo = await checkDependency(getFfmpegPath(), ['-version']);
  deps.push({
    name: 'ffmpeg',
    found: ffmpegInfo.found,
    version: ffmpegInfo.version,
    path: ffmpegInfo.path,
  });

  // node
  const nodeInfo = await checkDependency('node', ['--version']);
  deps.push({
    name: 'node',
    found: nodeInfo.found,
    version: nodeInfo.version,
    path: nodeInfo.path,
  });

  return deps;
}

async function checkDependency(
  cmd: string,
  args: string[]
): Promise<{ found: boolean; version: string | null; path: string | null }> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 10000 });
    const version = stdout.trim().split('\n')[0] || null;
    return { found: true, version, path: cmd };
  } catch {
    return { found: false, version: null, path: null };
  }
}

export function getOutputDir(): string {
  const settings = getSettings();
  return settings.outputFolder || path.join(process.cwd(), 'downloads');
}

export function getTempDir(): string {
  const settings = getSettings();
  return settings.tempDir || path.join(process.cwd(), '.tmp');
}

export function ensureDir(dir: string): void {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    eventBus.log('ERROR', `Failed to create directory ${dir}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// History persistence
export function loadHistory(): any[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveHistory(history: any[]): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    eventBus.log('ERROR', `Failed to save history: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validatePath(p: string): boolean {
  try {
    // Basic path validation — no null bytes, no shell metacharacters
    if (!p || p.includes('\0')) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCustomOptions(options: string): string[] {
  if (!options.trim()) return [];
  // Split by whitespace, but respect quoted strings
  const result: string[] = [];
  const regex = /"[^"]*"|'[^']*'|\S+/g;
  let match;
  while ((match = regex.exec(options)) !== null) {
    result.push(match[0].replace(/^["']|["']$/g, ''));
  }
  return result;
}
