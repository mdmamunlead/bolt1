'use client';

import { useState } from 'react';
import {
  Music,
  ClipboardPaste,
  X,
  Search,
  Loader2,
  Download,
  ListPlus,
  Clock,
  Settings2,
  Image,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useSettingsStore } from '@/stores/settings-store';
import { useDownloadStore } from '@/stores/download-store';
import { AUDIO_FORMATS, AUDIO_BITRATES, formatDuration, generateId } from '@/lib/constants';
import { toast } from 'sonner';
import type { VideoMetadata } from '@/lib/types';

export default function AudioDownloaderPage() {
  const { settings } = useSettingsStore();
  const addDownload = useDownloadStore((s) => s.addDownload);
  const addLog = useDownloadStore((s) => s.addLog);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState(settings.defaultAudioFormat || 'mp3');
  const [bitrate, setBitrate] = useState(settings.defaultAudioBitrate || '320');

  const [embedThumbnail, setEmbedThumbnail] = useState(false);
  const [embedMetadata, setEmbedMetadata] = useState(false);
  const [filenameTemplate, setFilenameTemplate] = useState(settings.filenameTemplate);
  const [outputDir, setOutputDir] = useState(settings.outputFolder);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      toast.error('Could not paste from clipboard');
    }
  }

  function handleClear() {
    setUrl('');
    setMetadata(null);
    setError(null);
  }

  async function handleFetch() {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    setLoading(true);
    setError(null);
    setMetadata(null);
    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        setMetadata(data.data);
        toast.success('Metadata fetched successfully');
      } else {
        setError(data.error?.message || 'Failed to fetch metadata');
        toast.error(data.error?.message || 'Failed to fetch metadata');
      }
    } catch {
      setError('Could not connect to backend');
      toast.error('Could not connect to backend');
    }
    setLoading(false);
  }

  async function startDownload(mode: 'now' | 'queue' | 'later') {
    if (!metadata) {
      toast.error('Please fetch metadata first');
      return;
    }
    const id = generateId();
    const item = {
      id,
      url,
      title: metadata.title || 'Unknown',
      thumbnail: metadata.thumbnail || null,
      type: 'audio' as const,
      format,
      quality: `${bitrate}kbps`,
      status: mode === 'now' ? ('downloading' as const) : ('waiting' as const),
      progress: 0,
      speed: 0,
      eta: 0,
      fileSize: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      playlistIndex: null,
      playlistId: null,
      outputDir: outputDir || settings.outputFolder,
      filename: metadata.title || 'audio',
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      embedThumbnail,
      embedMetadata,
      downloadSubtitles: false,
      embedSubtitles: false,
      subtitleLang: '',
      audioCodec: format,
      audioBitrate: bitrate,
      fps: '',
      isZip: false,
    };
    addDownload(item);
    addLog('INFO', `Added audio download: ${item.title}`, item.id);

    try {
      const endpoint = mode === 'now' ? '/api/downloads' : '/api/queue';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: 'audio',
          format,
          quality: bitrate,
          embedThumbnail,
          embedMetadata,
          filenameTemplate,
          outputDir: outputDir || settings.outputFolder,
          id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (mode === 'now') toast.success('Download started');
        else if (mode === 'queue') toast.success('Added to queue');
        else toast.success('Saved for later');
      } else {
        toast.error(data.error?.message || 'Failed to start download');
        useDownloadStore.getState().setStatus(item.id, 'failed');
      }
    } catch {
      toast.error('Could not connect to backend');
      useDownloadStore.getState().setStatus(item.id, 'failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Music className="h-5 w-5 text-primary" />
            Audio Downloader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste URL..."
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
            <Button variant="outline" onClick={handleClear} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button onClick={handleFetch} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Fetch
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && !metadata && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="aspect-video w-64" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {metadata && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted md:w-80">
                  {metadata.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={metadata.thumbnail} alt={metadata.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold leading-tight">{metadata.title}</h2>
                  {metadata.uploader && (
                    <p className="text-sm text-muted-foreground">{metadata.uploader}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {metadata.duration && (
                      <Badge variant="secondary">{formatDuration(metadata.duration)}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="h-5 w-5 text-primary" />
                Audio Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
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
                  <Label>Quality</Label>
                  <Select value={bitrate} onValueChange={setBitrate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_BITRATES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b === 'best' ? 'Best' : `${b} kbps`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Advanced Options
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Image className="h-4 w-4 text-muted-foreground" />
                          <Label>Embed thumbnail</Label>
                        </div>
                        <Switch checked={embedThumbnail} onCheckedChange={setEmbedThumbnail} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Label>Embed metadata</Label>
                        </div>
                        <Switch checked={embedMetadata} onCheckedChange={setEmbedMetadata} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Filename template</Label>
                        <Input
                          value={filenameTemplate}
                          onChange={(e) => setFilenameTemplate(e.target.value)}
                          placeholder="%(title)s.%(ext)s"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Output directory</Label>
                        <Input
                          value={outputDir}
                          onChange={(e) => setOutputDir(e.target.value)}
                          placeholder={settings.outputFolder || '/home/user/Downloads'}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => startDownload('now')} className="gap-2" size="lg">
              <Download className="h-4 w-4" />
              Download Now
            </Button>
            <Button onClick={() => startDownload('queue')} variant="outline" className="gap-2" size="lg">
              <ListPlus className="h-4 w-4" />
              Add to Queue
            </Button>
            <Button onClick={() => startDownload('later')} variant="ghost" className="gap-2" size="lg">
              <Clock className="h-4 w-4" />
              Download Later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
