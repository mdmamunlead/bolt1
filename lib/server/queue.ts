import type { DownloadItem, DownloadStatus } from '@/lib/types';
import { eventBus } from './event-bus';
import { startDownload, cancelDownload, pauseDownload, resumeDownload, type DownloadHandle } from './ytdlp';
import { getSettings, loadHistory, saveHistory } from './settings';
import { createZip, findDownloadedFile } from './filesystem';
import path from 'path';
import fs from 'fs';

interface QueueEntry {
  item: DownloadItem;
  handle: DownloadHandle | null;
  retries: number;
}

class QueueManager {
  private queue: Map<string, QueueEntry> = new Map();
  private activeCount = 0;
  private processing = false;

  add(item: DownloadItem): void {
    this.queue.set(item.id, { item, handle: null, retries: 0 });
    eventBus.log('INFO', `Added to queue: ${item.title}`, item.id);
    this.emitQueueUpdate();
    this.process();
  }

  addMany(items: DownloadItem[]): void {
    for (const item of items) {
      this.queue.set(item.id, { item, handle: null, retries: 0 });
    }
    eventBus.log('INFO', `Added ${items.length} items to queue`);
    this.emitQueueUpdate();
    this.process();
  }

  remove(id: string): boolean {
    const entry = this.queue.get(id);
    if (!entry) return false;
    if (entry.handle) {
      cancelDownload(id);
    }
    this.queue.delete(id);
    this.emitQueueUpdate();
    return true;
  }

  pause(id: string): boolean {
    const entry = this.queue.get(id);
    if (!entry) return false;
    const ok = pauseDownload(id);
    if (ok) {
      this.updateStatus(id, 'paused');
    }
    return ok;
  }

  resume(id: string): boolean {
    const entry = this.queue.get(id);
    if (!entry) return false;
    const ok = resumeDownload(id);
    if (ok) {
      this.updateStatus(id, 'downloading');
    }
    return ok;
  }

  cancel(id: string): boolean {
    const entry = this.queue.get(id);
    if (!entry) return false;
    cancelDownload(id);
    this.updateStatus(id, 'cancelled');
    return true;
  }

  retry(id: string): boolean {
    const entry = this.queue.get(id);
    if (!entry) return false;
    entry.retries = 0;
    entry.item.status = 'waiting';
    entry.item.progress = 0;
    entry.item.error = null;
    entry.handle = null;
    this.emitQueueUpdate();
    this.process();
    return true;
  }

  startAll(): void {
    for (const [, entry] of this.queue) {
      if (entry.item.status === 'paused' || entry.item.status === 'waiting') {
        entry.item.status = 'waiting';
      }
    }
    this.emitQueueUpdate();
    this.process();
  }

  pauseAll(): void {
    for (const [, entry] of this.queue) {
      if (entry.item.status === 'downloading' || entry.item.status === 'waiting') {
        if (entry.handle) pauseDownload(entry.item.id);
        this.updateStatus(entry.item.id, 'paused');
      }
    }
  }

  resumeAll(): void {
    for (const [, entry] of this.queue) {
      if (entry.item.status === 'paused') {
        if (entry.handle) resumeDownload(entry.item.id);
        this.updateStatus(entry.item.id, 'downloading');
      }
    }
    this.process();
  }

  cancelAll(): void {
    for (const [, entry] of this.queue) {
      if (entry.handle) cancelDownload(entry.item.id);
      this.updateStatus(entry.item.id, 'cancelled');
    }
  }

  getQueue(): DownloadItem[] {
    return Array.from(this.queue.values()).map((e) => e.item);
  }

  getItem(id: string): DownloadItem | null {
    return this.queue.get(id)?.item || null;
  }

  private updateStatus(id: string, status: DownloadStatus) {
    const entry = this.queue.get(id);
    if (!entry) return;
    entry.item.status = status;
    if (status === 'completed') {
      entry.item.completedAt = Date.now();
      entry.item.progress = 100;
    }
    if (status === 'downloading') {
      entry.item.startedAt = Date.now();
    }
    this.emitQueueUpdate();
  }

  private emitQueueUpdate() {
    eventBus.emitQueueUpdate(this.getQueue());
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    const settings = getSettings();
    const maxConcurrent = settings.concurrentDownloads || 2;

    while (this.activeCount < maxConcurrent) {
      const waiting = Array.from(this.queue.values()).find(
        (e) => e.item.status === 'waiting' && !e.handle
      );
      if (!waiting) break;

      this.activeCount++;
      waiting.item.status = 'downloading';
      waiting.item.startedAt = Date.now();
      this.emitQueueUpdate();

      const item = waiting.item;
      const entry = waiting;

      const handle = startDownload(
        {
          id: item.id,
          url: item.url,
          type: item.type === 'audio' ? 'audio' : 'video',
          format: item.format,
          quality: item.quality,
          fps: item.fps,
          audioCodec: item.audioCodec,
          audioBitrate: item.audioBitrate,
          embedThumbnail: item.embedThumbnail,
          embedMetadata: item.embedMetadata,
          downloadSubtitles: item.downloadSubtitles,
          embedSubtitles: item.embedSubtitles,
          subtitleLang: item.subtitleLang,
          outputDir: item.outputDir,
          playlistIndex: item.playlistIndex,
        },
        (progress) => {
          item.progress = progress.percent;
          item.speed = progress.speed;
          item.eta = progress.eta;
          item.downloadedBytes = progress.downloadedBytes;
          item.totalBytes = progress.totalBytes;
          if (progress.filename) item.filename = progress.filename;
          eventBus.emitProgress(item.id, progress);
        },
        (filePath, error) => {
          this.activeCount--;
          if (error) {
            if (error === 'Download cancelled') {
              this.updateStatus(item.id, 'cancelled');
            } else {
              entry.retries++;
              const maxRetries = settings.retryFailed ? settings.maxRetries : 0;
              if (entry.retries <= maxRetries) {
                eventBus.log('WARNING', `Retrying download (${entry.retries}/${maxRetries}): ${item.title}`, item.id);
                item.status = 'waiting';
                entry.handle = null;
                this.emitQueueUpdate();
              } else {
                item.error = error;
                this.updateStatus(item.id, 'failed');
                this.saveToHistory(item);
              }
            }
          } else {
            // Success — find the actual file
            const found = findDownloadedFile(item.outputDir, item.filename);
            if (found) {
              try {
                item.fileSize = fs.statSync(found).size;
              } catch {}
            }
            this.updateStatus(item.id, 'completed');
            this.saveToHistory(item);
          }
          this.process();
        }
      );

      entry.handle = handle;
    }

    this.processing = false;
  }

  private saveToHistory(item: DownloadItem) {
    const history = loadHistory();
    const existing = history.findIndex((h: DownloadItem) => h.id === item.id);
    if (existing >= 0) {
      history[existing] = item;
    } else {
      history.push(item);
    }
    saveHistory(history);
  }

  getHistory(): DownloadItem[] {
    return loadHistory();
  }

  deleteFromHistory(id: string): boolean {
    const history = loadHistory();
    const filtered = history.filter((h: DownloadItem) => h.id !== id);
    if (filtered.length !== history.length) {
      saveHistory(filtered);
      return true;
    }
    return false;
  }
}

export const queueManager = new QueueManager();
