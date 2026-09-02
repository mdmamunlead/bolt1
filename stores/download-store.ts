import { create } from 'zustand';
import { DownloadItem, DownloadStatus, DownloadProgress, LogEntry, LogLevel } from '@/lib/types';
import { generateId } from '@/lib/constants';

interface DownloadState {
  downloads: DownloadItem[];
  logs: LogEntry[];
  activeDownloads: number;
  totalSpeed: number;

  addDownload: (item: DownloadItem) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  updateProgress: (id: string, progress: DownloadProgress) => void;
  removeDownload: (id: string) => void;
  setStatus: (id: string, status: DownloadStatus) => void;
  reorderDownloads: (fromId: string, toId: string) => void;
  clearCompleted: () => void;
  clearFailed: () => void;
  clearAll: () => void;
  setDownloads: (downloads: DownloadItem[]) => void;

  addLog: (level: LogLevel, message: string, downloadId?: string) => void;
  clearLogs: () => void;
  setLogs: (logs: LogEntry[]) => void;

  recomputeStats: () => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  logs: [],
  activeDownloads: 0,
  totalSpeed: 0,

  addDownload: (item) =>
    set((state) => ({ downloads: [...state.downloads, item] })),

  updateDownload: (id, updates) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),

  updateProgress: (id, progress) =>
    set((state) => {
      const downloads = state.downloads.map((d) =>
        d.id === id
          ? {
              ...d,
              progress: progress.percent,
              speed: progress.speed,
              eta: progress.eta,
              downloadedBytes: progress.downloadedBytes,
              totalBytes: progress.totalBytes,
              filename: progress.filename || d.filename,
              status: 'downloading' as DownloadStatus,
            }
          : d
      );
      return { downloads };
    }),

  removeDownload: (id) =>
    set((state) => ({ downloads: state.downloads.filter((d) => d.id !== id) })),

  setStatus: (id, status) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              ...(status === 'completed' ? { completedAt: Date.now(), progress: 100 } : {}),
              ...(status === 'paused' ? { speed: 0, eta: 0 } : {}),
              ...(status === 'failed' || status === 'cancelled' ? { speed: 0, eta: 0 } : {}),
            }
          : d
      ),
    })),

  reorderDownloads: (fromId, toId) =>
    set((state) => {
      const downloads = [...state.downloads];
      const fromIdx = downloads.findIndex((d) => d.id === fromId);
      const toIdx = downloads.findIndex((d) => d.id === toId);
      if (fromIdx === -1 || toIdx === -1) return state;
      const [moved] = downloads.splice(fromIdx, 1);
      downloads.splice(toIdx, 0, moved);
      return { downloads };
    }),

  clearCompleted: () =>
    set((state) => ({ downloads: state.downloads.filter((d) => d.status !== 'completed') })),

  clearFailed: () =>
    set((state) => ({ downloads: state.downloads.filter((d) => d.status !== 'failed') })),

  clearAll: () => set({ downloads: [] }),

  setDownloads: (downloads) => set({ downloads }),

  addLog: (level, message, downloadId) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { id: generateId(), timestamp: Date.now(), level, message, downloadId: downloadId || null },
      ].slice(-500),
    })),

  clearLogs: () => set({ logs: [] }),
  setLogs: (logs) => set({ logs }),

  recomputeStats: () => {
    const { downloads } = get();
    const active = downloads.filter((d) => d.status === 'downloading' || d.status === 'processing');
    const totalSpeed = active.reduce((sum, d) => sum + d.speed, 0);
    set({ activeDownloads: active.length, totalSpeed });
  },
}));
