'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Terminal,
  Pause,
  Play,
  Trash2,
  Search,
  Copy,
  Download,
  Info,
  Bug,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  DownloadCloud,
  Film,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDownloadStore } from '@/stores/download-store';
import { formatTimeShort } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LogLevel } from '@/lib/types';

const LEVEL_CONFIG: Record<LogLevel, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  INFO: { color: 'text-blue-500', icon: Info },
  DEBUG: { color: 'text-muted-foreground', icon: Bug },
  WARNING: { color: 'text-warning', icon: AlertTriangle },
  ERROR: { color: 'text-destructive', icon: AlertCircle },
  SUCCESS: { color: 'text-success', icon: CheckCircle2 },
  DOWNLOAD: { color: 'text-primary', icon: DownloadCloud },
  FFMPEG: { color: 'text-purple-500', icon: Film },
};

export default function ConsolePage() {
  const { logs, clearLogs } = useDownloadStore();
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = useMemo(() => {
    let result = logs;
    if (levelFilter !== 'ALL') {
      result = result.filter((l) => l.level === levelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }
    return result;
  }, [logs, levelFilter, search]);

  useEffect(() => {
    if (autoScroll && !paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered, autoScroll, paused]);

  function copyLogs() {
    const text = filtered
      .map((l) => `[${formatTimeShort(l.timestamp)}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Logs copied to clipboard');
  }

  function exportLogs() {
    const text = filtered
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downloader-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-5 w-5 text-primary" />
              Console
              <Badge variant="secondary">{filtered.length} logs</Badge>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaused(!paused)}
                className="gap-1.5"
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="outline" size="sm" onClick={copyLogs} className="gap-1.5">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs} className="gap-1.5">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { clearLogs(); toast.success('Console cleared'); }}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'INFO', 'DOWNLOAD', 'FFMPEG', 'WARNING', 'ERROR', 'SUCCESS', 'DEBUG'] as const).map((level) => (
                <Button
                  key={level}
                  variant={levelFilter === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLevelFilter(level)}
                  className="px-2.5 text-xs"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Console output */}
          <div
            ref={scrollRef}
            className="h-[500px] overflow-y-auto scrollbar-thin rounded-lg border border-border bg-zinc-950 p-4 font-mono text-xs"
          >
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Terminal className="mx-auto h-8 w-8 opacity-50" />
                  <p className="mt-2">No logs yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((log) => {
                  const config = LEVEL_CONFIG[log.level];
                  const Icon = config.icon;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 rounded px-2 py-0.5 hover:bg-white/5"
                    >
                      <span className="shrink-0 text-zinc-600">
                        {formatTimeShort(log.timestamp)}
                      </span>
                      <span className={cn('shrink-0 font-semibold', config.color)}>
                        <Icon className="inline h-3 w-3" /> [{log.level}]
                      </span>
                      <span className="text-zinc-300">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auto-scroll toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll to bottom
            </label>
            {paused && (
              <Badge variant="outline" className="text-warning">
                Paused
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
