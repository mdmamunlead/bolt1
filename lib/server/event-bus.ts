import { EventEmitter } from 'events';
import type { LogEntry, LogLevel, DownloadProgress, DownloadItem } from '@/lib/types';
import { generateId } from '@/lib/constants';

export interface ServerLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  downloadId: string | null;
}

export interface QueueUpdateEvent {
  type: 'progress' | 'status' | 'log' | 'queue';
  downloadId?: string;
  progress?: DownloadProgress;
  status?: DownloadItem['status'];
  item?: Partial<DownloadItem>;
  log?: ServerLogEntry;
  queue?: DownloadItem[];
}

class EventBus extends EventEmitter {
  private logs: ServerLogEntry[] = [];
  private maxLogs = 500;

  log(level: LogLevel, message: string, downloadId?: string) {
    const entry: ServerLogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      level,
      message,
      downloadId: downloadId || null,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    this.emit('log', entry);
  }

  getLogs(): ServerLogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  emitProgress(downloadId: string, progress: DownloadProgress) {
    this.emit('progress', { downloadId, progress });
  }

  emitStatus(downloadId: string, status: DownloadItem['status'], item?: Partial<DownloadItem>) {
    this.emit('status', { downloadId, status, item });
  }

  emitQueueUpdate(queue: DownloadItem[]) {
    this.emit('queue', queue);
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(100);
