'use client';

import { useState, useMemo } from 'react';
import {
  FolderDown,
  Search,
  Play,
  FolderOpen,
  Copy,
  Trash2,
  RotateCcw,
  Filter,
  Calendar,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDownloadStore } from '@/stores/download-store';
import { formatBytes, formatTimestamp } from '@/lib/constants';
import { toast } from 'sonner';
import { StatusBadge } from '@/app/(app)/dashboard/page';
import type { DownloadType, DownloadStatus } from '@/lib/types';

type Category = 'all' | 'video' | 'audio' | 'playlist' | 'zip' | 'completed' | 'failed';

export default function DownloadsPage() {
  const { downloads, removeDownload } = useDownloadStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = [...downloads];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.url.toLowerCase().includes(q)
      );
    }

    // Category filter
    switch (category) {
      case 'video':
        result = result.filter((d) => d.type === 'video');
        break;
      case 'audio':
        result = result.filter((d) => d.type === 'audio');
        break;
      case 'playlist':
        result = result.filter((d) => d.type === 'playlist');
        break;
      case 'zip':
        result = result.filter((d) => d.isZip);
        break;
      case 'completed':
        result = result.filter((d) => d.status === 'completed');
        break;
      case 'failed':
        result = result.filter((d) => d.status === 'failed');
        break;
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'date':
          cmp = a.createdAt - b.createdAt;
          break;
        case 'size':
          cmp = a.fileSize - b.fileSize;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [downloads, search, category, sortBy, sortOrder]);

  async function openFile(id: string) {
    try {
      const res = await fetch(`/api/downloads/${id}/open`);
      const data = await res.json();
      if (!data.success) toast.error(data.error?.message || 'Could not open file');
    } catch {
      toast.error('Could not open file');
    }
  }

  async function openFolder(id: string) {
    try {
      const res = await fetch(`/api/downloads/${id}/folder`);
      const data = await res.json();
      if (!data.success) toast.error(data.error?.message || 'Could not open folder');
    } catch {
      toast.error('Could not open folder');
    }
  }

  async function copyPath(id: string) {
    try {
      const res = await fetch(`/api/downloads/${id}/path`);
      const data = await res.json();
      if (data.success && data.data?.path) {
        await navigator.clipboard.writeText(data.data.path);
        toast.success('Path copied to clipboard');
      }
    } catch {
      toast.error('Could not copy path');
    }
  }

  async function deleteItem(id: string) {
    try {
      await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
      removeDownload(id);
      toast.success('Download removed');
    } catch {
      toast.error('Could not remove download');
    }
  }

  async function retry(id: string) {
    try {
      const res = await fetch(`/api/queue/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) toast.success('Retry started');
      else toast.error(data.error?.message || 'Retry failed');
    } catch {
      toast.error('Could not retry download');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search downloads..."
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="playlist">Playlist</SelectItem>
                <SelectItem value="zip">ZIP</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'size' | 'title')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Downloads */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderDown className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No downloads found</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-3">
                {/* Thumbnail */}
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <FolderDown className="h-5 w-5 text-muted-foreground/50" />
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
                    {item.isZip && <Badge variant="outline" className="text-xs">ZIP</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="uppercase">{item.type}</span>
                    <span>{item.format}</span>
                    <span>{item.quality}</span>
                    {item.fileSize > 0 && <span>{formatBytes(item.fileSize)}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {item.status === 'completed' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFile(item.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFolder(item.id)}>
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {item.status === 'failed' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => retry(item.id)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyPath(item.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
