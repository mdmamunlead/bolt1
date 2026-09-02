'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { useSettingsStore } from '@/stores/settings-store';
import { useDownloadStore } from '@/stores/download-store';
import { useUIStore } from '@/stores/ui-store';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import type { Settings } from '@/lib/types';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings, setSettings, loaded } = useSettingsStore();
  const setDownloads = useDownloadStore((s) => s.setDownloads);
  const setLogs = useDownloadStore((s) => s.setLogs);
  const updateDownload = useDownloadStore((s) => s.updateDownload);
  const updateProgress = useDownloadStore((s) => s.updateProgress);
  const addLog = useDownloadStore((s) => s.addLog);
  const recomputeStats = useDownloadStore((s) => s.recomputeStats);
  const setFirstRunComplete = useUIStore((s) => s.setFirstRunComplete);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.data });
          } else {
            setSettings(DEFAULT_SETTINGS);
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    loadSettings();
  }, [setSettings]);

  // Load initial state (downloads + logs)
  useEffect(() => {
    async function loadState() {
      try {
        const [dlRes, logRes] = await Promise.all([fetch('/api/downloads'), fetch('/api/logs')]);
        if (dlRes.ok) {
          const dlData = await dlRes.json();
          if (dlData.success && dlData.data) setDownloads(dlData.data);
        }
        if (logRes.ok) {
          const logData = await logRes.json();
          if (logData.success && logData.data) setLogs(logData.data);
        }
      } catch {
        // server may not be fully ready yet
      }
    }
    loadState();
  }, [setDownloads, setLogs]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'progress' && data.downloadId && data.progress) {
              updateProgress(data.downloadId, data.progress);
            } else if (data.type === 'status' && data.downloadId) {
              updateDownload(data.downloadId, {
                status: data.status,
                ...(data.item || {}),
              });
            } else if (data.type === 'log' && data.log) {
              addLog(data.log.level, data.log.message, data.log.downloadId || undefined);
            } else if (data.type === 'queue' && data.queue) {
              setDownloads(data.queue);
            }
          } catch {
            // ignore parse errors
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          // Reconnect after 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [updateProgress, updateDownload, addLog, setDownloads]);

  // Recompute stats periodically
  useEffect(() => {
    const interval = setInterval(() => recomputeStats(), 1000);
    return () => clearInterval(interval);
  }, [recomputeStats]);

  // First run check
  useEffect(() => {
    if (loaded && !settings.outputFolder) {
      setFirstRunComplete(false);
    }
  }, [loaded, settings.outputFolder, setFirstRunComplete]);

  return <AppShell pathname={pathname}>{children}</AppShell>;
}
