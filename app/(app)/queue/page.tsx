'use client';

import { useState, useEffect } from 'react';
import {
  ListChecks,
  Play,
  Pause,
  X,
  RotateCcw,
  Trash2,
  GripVertical,
  PlayCircle,
  PauseCircle,
  XCircle,
  Eraser,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDownloadStore } from '@/stores/download-store';
import { useSettingsStore } from '@/stores/settings-store';
import { formatSpeed, formatEta, formatBytes, formatDuration } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/app/(app)/dashboard/page';
import type { DownloadItem } from '@/lib/types';

export default function QueuePage() {
  const { downloads, reorderDownloads, clearCompleted, clearFailed, clearAll } = useDownloadStore();
  const { settings } = useSettingsStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const queue = downloads.filter(
    (d) => d.status === 'waiting' || d.status === 'downloading' || d.status === 'processing' || d.status === 'paused'
  );
  const completed = downloads.filter((d) => d.status === 'completed');
  const failed = downloads.filter((d) => d.status === 'failed');

  async function controlItem(id: string, action: 'pause' | 'resume' | 'cancel' | 'retry' | 'remove') {
    try {
      const res = await fetch(`/api/queue/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (action === 'remove') {
          useDownloadStore.getState().removeDownload(id);
        }
        toast.success(`Download ${action}d`);
      } else {
        toast.error(data.error?.message || `Failed to ${action} download`);
      }
    } catch {
      toast.error(`Could not ${action} download`);
    }
  }

  async function globalAction(action: string) {
    try {
      const res = await fetch(`/api/queue/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Action completed: ${action}`);
      } else {
        toast.error(data.error?.message || `Failed: ${action}`);
      }
    } catch {
      toast.error('Action failed');
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      reorderDownloads(draggedId, id);
      toast.success('Queue reordered');
    }
    setDraggedId(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Global Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-primary" />
              Download Queue
              <Badge variant="secondary">{queue.length} items</Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => globalAction('start-all')} className="gap-1.5">
                <PlayCircle className="h-4 w-4" />
                Start All
              </Button>
              <Button variant="outline" size="sm" onClick={() => globalAction('pause-all')} className="gap-1.5">
                <PauseCircle className="h-4 w-4" />
                Pause All
              </Button>
              <Button variant="outline" size="sm" onClick={() => globalAction('cancel-all')} className="gap-1.5">
                <XCircle className="h-4 w-4" />
                Cancel All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { clearCompleted(); toast.success('Cleared completed'); }} className="gap-1.5">
                <Eraser className="h-4 w-4" />
                Clear Completed
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { clearFailed(); toast.success('Cleared failed'); }} className="gap-1.5">
                <Eraser className="h-4 w-4" />
                Clear Failed
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearAll()} className="gap-1.5 text-destructive">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Queue Items */}
      {queue.length === 0 && completed.length === 0 && failed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ListChecks className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Queue is empty</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add downloads from the Video, Audio, or Playlist pages
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              onControl={controlItem}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedId === item.id}
            />
          ))}
          {failed.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              onControl={controlItem}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedId === item.id}
            />
          ))}
          {completed.map((item) => (
            <QueueItemRow
              key={item.id}
              item={item}
              onControl={controlItem}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueItemRow({
  item,
  onControl,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  item: DownloadItem;
  onControl: (id: string, action: 'pause' | 'resume' | 'cancel' | 'retry' | 'remove') => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
}) {
  const isActive = item.status === 'downloading' || item.status === 'processing';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDrop={(e) => onDrop(e, item.id)}
      className={cn('transition-opacity', isDragging && 'opacity-50')}
    >
      <CardContent className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-muted-foreground/50" />

        {/* Thumbnail */}
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ListChecks className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
          {item.playlistIndex != null && (
            <div className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
              #{item.playlistIndex}
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
          </div>
          {isActive && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={item.progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">
                {item.progress.toFixed(1)}%
                {item.speed > 0 && ` • ${formatSpeed(item.speed)}`}
                {item.eta > 0 && ` • ETA ${formatEta(item.eta)}`}
              </span>
            </div>
          )}
          {item.status === 'failed' && item.error && (
            <p className="mt-1 text-xs text-destructive">{item.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {item.status === 'downloading' && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onControl(item.id, 'pause')}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {(item.status === 'paused' || item.status === 'waiting') && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onControl(item.id, 'resume')}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(item.status === 'downloading' || item.status === 'paused' || item.status === 'waiting') && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onControl(item.id, 'cancel')}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {item.status === 'failed' && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onControl(item.id, 'retry')}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onControl(item.id, 'remove')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
