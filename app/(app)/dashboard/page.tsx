'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Music,
  ListVideo,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  ListChecks,
  HardDrive,
  Play,
  FolderOpen,
  Copy,
  Trash2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDownloadStore } from '@/stores/download-store';
import { formatBytes, formatSpeed, formatDuration, formatTimestamp } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/status-badge';
import type { DownloadItem } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { downloads, logs } = useDownloadStore();
  const [systemStatus, setSystemStatus] = useState<{
    activeDownloads: number;
    queuedDownloads: number;
    totalDownloads: number;
    totalDownloadedBytes: number;
  } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/system/status');
        const data = await res.json();
        if (data.success) setSystemStatus(data.data);
      } catch {
        // ignore
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const total = downloads.length;
  const active = downloads.filter((d) => d.status === 'downloading' || d.status === 'processing').length;
  const completed = downloads.filter((d) => d.status === 'completed').length;
  const failed = downloads.filter((d) => d.status === 'failed').length;
  const queued = downloads.filter((d) => d.status === 'waiting').length;
  const totalDownloaded = downloads
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + d.fileSize, 0);

  const recent = [...downloads].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  const stats = [
    { label: 'Total Downloads', value: total, icon: Download, color: 'text-primary' },
    { label: 'Active', value: active, icon: Loader2, color: 'text-warning', spin: active > 0 },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'text-destructive' },
    { label: 'Queue Items', value: queued, icon: ListChecks, color: 'text-primary' },
    { label: 'Total Downloaded', value: formatBytes(totalDownloaded), icon: HardDrive, color: 'text-success' },
  ];

  const quickActions = [
    {
      title: 'Video Downloader',
      description: 'Download videos in different formats and qualities',
      icon: Video,
      path: '/video',
    },
    {
      title: 'Audio Downloader',
      description: 'Extract high-quality audio from any source',
      icon: Music,
      path: '/audio',
    },
    {
      title: 'Playlist Downloader',
      description: 'Download entire playlists or selected videos',
      icon: ListVideo,
      path: '/playlist',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                  </div>
                  <Icon className={cn('h-5 w-5', stat.color, stat.spin && 'animate-spin')} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => router.push(action.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription className="mt-0.5 text-xs">{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Downloads */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent Downloads</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/downloads')}>
            View All
          </Button>
        </div>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Download className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No downloads yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Start by downloading a video, audio, or playlist
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => (
              <RecentDownloadRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentDownloadRow({ item }: { item: DownloadItem }) {
  const router = useRouter();

  async function openFile() {
    try {
      const res = await fetch(`/api/downloads/${item.id}/open`);
      const data = await res.json();
      if (!data.success) toast.error(data.error?.message || 'Could not open file');
    } catch {
      toast.error('Could not open file');
    }
  }

  async function openFolder() {
    try {
      const res = await fetch(`/api/downloads/${item.id}/folder`);
      const data = await res.json();
      if (!data.success) toast.error(data.error?.message || 'Could not open folder');
    } catch {
      toast.error('Could not open folder');
    }
  }

  async function copyPath() {
    try {
      const res = await fetch(`/api/downloads/${item.id}/path`);
      const data = await res.json();
      if (data.success && data.data?.path) {
        await navigator.clipboard.writeText(data.data.path);
        toast.success('Path copied to clipboard');
      }
    } catch {
      toast.error('Could not copy path');
    }
  }

  async function deleteItem() {
    try {
      await fetch(`/api/downloads/${item.id}`, { method: 'DELETE' });
      useDownloadStore.getState().removeDownload(item.id);
      toast.success('Download removed');
    } catch {
      toast.error('Could not remove download');
    }
  }

  async function retry() {
    try {
      const res = await fetch(`/api/queue/${item.id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Retry started');
      } else {
        toast.error(data.error?.message || 'Retry failed');
      }
    } catch {
      toast.error('Could not retry download');
    }
  }

  return (
    <Card className="animate-fade-in">
      <CardContent className="flex items-center gap-4 p-3">
        {/* Thumbnail */}
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Download className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="uppercase">{item.type}</span>
            <span>{item.format}</span>
            <span>{item.quality}</span>
            {item.fileSize > 0 && <span>{formatBytes(item.fileSize)}</span>}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(item.createdAt)}
            </span>
          </div>
          {(item.status === 'downloading' || item.status === 'processing') && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={item.progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">
                {item.progress.toFixed(1)}%
                {item.speed > 0 && ` • ${formatSpeed(item.speed)}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {item.status === 'completed' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openFile}>
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openFolder}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </>
          )}
          {item.status === 'failed' && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={retry}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyPath}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={deleteItem}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


