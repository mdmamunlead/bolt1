'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ListVideo,
  ClipboardPaste,
  X,
  Search,
  Loader2,
  Download,
  Settings2,
  Film,
  Music,
  Package,
  CheckCheck,
  AlertCircle,
  FileArchive,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores/settings-store';
import { useDownloadStore } from '@/stores/download-store';
import { VIDEO_FORMATS, VIDEO_QUALITIES, AUDIO_FORMATS, AUDIO_BITRATES, formatDuration, generateId } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PlaylistMetadata, PlaylistVideo, SelectionMode } from '@/lib/types';

export default function PlaylistDownloaderPage() {
  const { settings } = useSettingsStore();
  const addDownload = useDownloadStore((s) => s.addDownload);
  const addLog = useDownloadStore((s) => s.addLog);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>(settings.defaultSelectionMode || 'entire');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [customRange, setCustomRange] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Download options
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [format, setFormat] = useState(settings.defaultVideoFormat || 'mp4');
  const [quality, setQuality] = useState(settings.defaultVideoQuality || '1080p');
  const [audioBitrate, setAudioBitrate] = useState(settings.defaultAudioBitrate || '320');
  const [enableZip, setEnableZip] = useState(settings.defaultZipSetting);
  const [outputDir, setOutputDir] = useState(settings.outputFolder);

  const [showConfirm, setShowConfirm] = useState(false);

  const videoCount = playlist?.videos.length || 0;

  const selectedVideos = useMemo(() => {
    if (!playlist) return [];
    return playlist.videos.filter((v) => selectedIds.has(v.id));
  }, [playlist, selectedIds]);

  const selectedCount = selectedVideos.length;

  const selectAll = useCallback(() => {
    if (!playlist) return;
    setSelectedIds(new Set(playlist.videos.map((v) => v.id)));
  }, [playlist]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleVideo = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function applyRange() {
    if (!playlist) return;
    setRangeError(null);
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    const max = playlist.videos.length;

    if (isNaN(start) || isNaN(end)) {
      setRangeError('Please enter valid numbers');
      return;
    }
    if (start < 1) {
      setRangeError('Start video must be at least 1');
      return;
    }
    if (end > max) {
      setRangeError(`End video cannot be greater than the playlist size (${max})`);
      return;
    }
    if (start > end) {
      setRangeError('Start video cannot be greater than end video');
      return;
    }

    const ids = new Set<string>();
    for (let i = start - 1; i <= end - 1; i++) {
      ids.add(playlist.videos[i].id);
    }
    setSelectedIds(ids);
    toast.success(`Selected videos ${start}–${end} (${ids.size} videos)`);
  }

  function applyCustomRange() {
    if (!playlist) return;
    setRangeError(null);
    const max = playlist.videos.length;

    try {
      const parts = customRange.split(',').map((s) => s.trim());
      const ids = new Set<string>();
      const seen = new Set<number>();

      for (const part of parts) {
        if (part.includes('-')) {
          const [s, e] = part.split('-').map((n) => parseInt(n.trim(), 10));
          if (isNaN(s) || isNaN(e)) throw new Error(`Invalid range: ${part}`);
          if (s < 1 || e < 1) throw new Error(`Numbers must be at least 1: ${part}`);
          if (s > max || e > max) throw new Error(`Numbers cannot exceed playlist size (${max}): ${part}`);
          if (s > e) throw new Error(`Start cannot be greater than end: ${part}`);
          for (let i = s; i <= e; i++) {
            if (!seen.has(i)) {
              seen.add(i);
              ids.add(playlist.videos[i - 1].id);
            }
          }
        } else {
          const n = parseInt(part, 10);
          if (isNaN(n)) throw new Error(`Invalid number: ${part}`);
          if (n < 1) throw new Error(`Number must be at least 1: ${part}`);
          if (n > max) throw new Error(`Number cannot exceed playlist size (${max}): ${part}`);
          if (!seen.has(n)) {
            seen.add(n);
            ids.add(playlist.videos[n - 1].id);
          }
        }
      }

      setSelectedIds(ids);
      toast.success(`Selected ${ids.size} videos`);
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : 'Invalid custom range');
    }
  }

  function getSelectionSummary(): string {
    if (selectedCount === 0) return 'None';
    if (selectedCount === videoCount) return 'All videos';
    const indices = selectedVideos.map((v) => v.index).sort((a, b) => a - b);
    // Check if contiguous
    let isContiguous = true;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        isContiguous = false;
        break;
      }
    }
    if (isContiguous && indices.length > 1) {
      return `${indices[0]}–${indices[indices.length - 1]}`;
    }
    return indices.join(', ');
  }

  async function handleFetch() {
    if (!url.trim()) {
      toast.error('Please enter a playlist URL');
      return;
    }
    setLoading(true);
    setError(null);
    setPlaylist(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaylist(data.data);
        // Auto-select all if mode is 'entire'
        if (selectionMode === 'entire') {
          setSelectedIds(new Set(data.data.videos.map((v: PlaylistVideo) => v.id)));
        }
        toast.success(`Found ${data.data.video_count} videos`);
      } else {
        setError(data.error?.message || 'Failed to fetch playlist');
        toast.error(data.error?.message || 'Failed to fetch playlist');
      }
    } catch {
      setError('Could not connect to backend');
      toast.error('Could not connect to backend');
    }
    setLoading(false);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      toast.error('Could not paste from clipboard');
    }
  }

  function handleStartDownload() {
    setShowConfirm(true);
  }

  async function confirmDownload() {
    if (!playlist || selectedCount === 0) return;
    setShowConfirm(false);

    const items = selectedVideos.map((video) => {
      const id = generateId();
      const item = {
        id,
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        type: downloadType,
        format: downloadType === 'video' ? format : format === 'mp3' ? 'mp3' : format,
        quality: downloadType === 'video' ? quality : `${audioBitrate}kbps`,
        status: 'waiting' as const,
        progress: 0,
        speed: 0,
        eta: 0,
        fileSize: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        playlistIndex: video.index,
        playlistId: playlist.id,
        outputDir: outputDir || settings.outputFolder,
        filename: video.title,
        error: null,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        embedThumbnail: false,
        embedMetadata: false,
        downloadSubtitles: false,
        embedSubtitles: false,
        subtitleLang: '',
        audioCodec: downloadType === 'audio' ? format : 'best',
        audioBitrate: downloadType === 'audio' ? audioBitrate : 'best',
        fps: '',
        isZip: enableZip,
      };
      return item;
    });

    items.forEach((item) => {
      addDownload(item);
      addLog('INFO', `Queued playlist item ${item.playlistIndex}: ${item.title}`, item.id);
    });

    if (enableZip) {
      addLog('INFO', `ZIP download enabled for playlist: ${playlist.title}`);
    }

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: playlist.id,
          playlistTitle: playlist.title,
          items: items.map((i) => ({
            id: i.id,
            url: i.url,
            playlistIndex: i.playlistIndex,
            title: i.title,
          })),
          type: downloadType,
          format,
          quality: downloadType === 'video' ? quality : audioBitrate,
          enableZip,
          outputDir: outputDir || settings.outputFolder,
          preserveNumbering: settings.preserveNumbering,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Started downloading ${selectedCount} ${selectedCount === 1 ? 'video' : 'videos'}`);
      } else {
        toast.error(data.error?.message || 'Failed to start download');
      }
    } catch {
      toast.error('Could not connect to backend');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListVideo className="h-5 w-5 text-primary" />
            Playlist Downloader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste playlist URL..."
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) handleFetch();
                }}
              />
              {url && (
                <button
                  onClick={() => setUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" onClick={handlePaste} className="gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Paste
            </Button>
            <Button variant="outline" onClick={() => { setUrl(''); setPlaylist(null); setSelectedIds(new Set()); setError(null); }} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleFetch} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Fetch
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && !playlist && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="aspect-video w-64" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {playlist && (
        <div className="space-y-6">
          {/* Playlist Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted md:w-64">
                  {playlist.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={playlist.thumbnail} alt={playlist.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold leading-tight">{playlist.title}</h2>
                  {playlist.uploader && (
                    <p className="text-sm text-muted-foreground">{playlist.uploader}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary">{playlist.video_count} videos</Badge>
                    {playlist.total_duration && (
                      <Badge variant="outline">{formatDuration(playlist.total_duration)}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selection Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['entire', 'range', 'individual', 'custom'] as SelectionMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={selectionMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectionMode(mode);
                      setRangeError(null);
                      if (mode === 'entire') selectAll();
                      if (mode === 'individual') selectNone();
                    }}
                    className="capitalize"
                  >
                    {mode === 'entire' && 'Entire Playlist'}
                    {mode === 'range' && 'Range'}
                    {mode === 'individual' && 'Individual'}
                    {mode === 'custom' && 'Custom Range'}
                  </Button>
                ))}
              </div>

              {/* Range selection */}
              {selectionMode === 'range' && (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Video</Label>
                      <Input
                        type="number"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        placeholder="1"
                        className="w-24"
                        min={1}
                        max={videoCount}
                      />
                    </div>
                    <span className="pb-2 text-muted-foreground">→</span>
                    <div className="space-y-1">
                      <Label className="text-xs">End Video</Label>
                      <Input
                        type="number"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        placeholder={String(videoCount)}
                        className="w-24"
                        min={1}
                        max={videoCount}
                      />
                    </div>
                    <Button onClick={applyRange} size="sm" className="gap-2">
                      <CheckCheck className="h-4 w-4" />
                      Apply Range
                    </Button>
                  </div>
                  {rangeError && (
                    <p className="mt-2 text-xs text-destructive">{rangeError}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setRangeStart('1'); setRangeEnd(String(videoCount)); }}>
                      Select All (1–{videoCount})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setRangeStart('1'); setRangeEnd(String(Math.min(3, videoCount))); }}>
                      First 3 (1–3)
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setRangeStart(String(Math.max(1, videoCount - 2))); setRangeEnd(String(videoCount)); }}>
                      Last 3 ({Math.max(1, videoCount - 2)}–{videoCount})
                    </Button>
                  </div>
                </div>
              )}

              {/* Custom range */}
              {selectionMode === 'custom' && (
                <div className="rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label>Custom Range</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        placeholder="1-3,5,8-10,15"
                        className="flex-1"
                      />
                      <Button onClick={applyCustomRange} size="sm" className="gap-2">
                        <CheckCheck className="h-4 w-4" />
                        Apply
                      </Button>
                    </div>
                    {rangeError && (
                      <p className="text-xs text-destructive">{rangeError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter ranges like 1-3,5,8-10,15 — duplicates are removed automatically
                    </p>
                  </div>
                </div>
              )}

              {/* Selection summary */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Playlist: </span>
                  <span className="font-medium">{videoCount} videos</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-medium text-primary">{getSelectionSummary()}</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {selectedCount} {selectedCount === 1 ? 'video' : 'videos'} selected
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Video List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Videos</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] space-y-1 overflow-y-auto scrollbar-thin">
                {playlist.videos.map((video) => {
                  const isSelected = selectedIds.has(video.id);
                  return (
                    <div
                      key={video.id}
                      onClick={() => toggleVideo(video.id)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors',
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-transparent hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleVideo(video.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
                        {video.index}
                      </span>
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                        {video.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {video.uploader && <span>{video.uploader}</span>}
                          {video.duration && <span>• {formatDuration(video.duration)}</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="shrink-0 text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Download Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={downloadType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDownloadType('video'); setFormat(settings.defaultVideoFormat || 'mp4'); setQuality(settings.defaultVideoQuality || '1080p'); }}
                  className="gap-2"
                >
                  <Film className="h-4 w-4" />
                  Video
                </Button>
                <Button
                  variant={downloadType === 'audio' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDownloadType('audio'); setFormat(settings.defaultAudioFormat || 'mp3'); }}
                  className="gap-2"
                >
                  <Music className="h-4 w-4" />
                  Audio
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {downloadType === 'video' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quality</Label>
                      <Select value={quality} onValueChange={setQuality}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VIDEO_QUALITIES.filter((q) => q !== 'custom').map((q) => (
                            <SelectItem key={q} value={q}>
                              {q === 'best' ? 'Best' : q === '2160p' ? '2160p / 4K' : q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIO_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bitrate</Label>
                      <Select value={audioBitrate} onValueChange={setAudioBitrate}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIO_BITRATES.filter((b) => b !== 'custom').map((b) => (
                            <SelectItem key={b} value={b}>
                              {b === 'best' ? 'Best' : `${b} kbps`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Output Folder</Label>
                  <Input
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    placeholder={settings.outputFolder || '/home/user/Downloads'}
                  />
                </div>
              </div>

              {/* ZIP option */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <FileArchive className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Download as ZIP</Label>
                    <p className="text-xs text-muted-foreground">
                      Bundle all selected videos into a single ZIP file
                    </p>
                  </div>
                </div>
                <Switch checked={enableZip} onCheckedChange={setEnableZip} />
              </div>
            </CardContent>
          </Card>

          {/* Start Download */}
          <div className="flex justify-end">
            <Button
              onClick={handleStartDownload}
              disabled={selectedCount === 0}
              size="lg"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Start Download ({selectedCount} {selectedCount === 1 ? 'item' : 'items'})
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Download Summary
            </DialogTitle>
          </DialogHeader>
          {playlist && (
            <div className="space-y-3 py-4">
              <SummaryRow label="Playlist" value={playlist.title} />
              <SummaryRow label="Selected" value={`Videos ${getSelectionSummary()}`} />
              <SummaryRow label="Total" value={`${selectedCount} ${selectedCount === 1 ? 'video' : 'videos'}`} />
              <SummaryRow label="Format" value={downloadType === 'video' ? format.toUpperCase() : format.toUpperCase()} />
              <SummaryRow label="Quality" value={downloadType === 'video' ? quality : `${audioBitrate} kbps`} />
              <SummaryRow label="ZIP" value={enableZip ? 'Enabled' : 'Disabled'} />
              <SummaryRow label="Output" value={outputDir || settings.outputFolder || 'Default'} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDownload} className="gap-2">
              <Play className="h-4 w-4" />
              Start Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
