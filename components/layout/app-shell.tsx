'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  Music,
  ListVideo,
  ListChecks,
  FolderDown,
  Terminal,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Search,
  Moon,
  Sun,
  Monitor,
  Download,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useDownloadStore } from '@/stores/download-store';
import { useSettingsStore } from '@/stores/settings-store';
import { formatSpeed } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/layout/command-palette';
import { FirstRunWizard } from '@/components/layout/first-run-wizard';
import { Toaster } from '@/components/ui/sonner';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  match: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', match: ['/dashboard'] },
  { label: 'Video Downloader', icon: Video, path: '/video', match: ['/video'] },
  { label: 'Audio Downloader', icon: Music, path: '/audio', match: ['/audio'] },
  { label: 'Playlist Downloader', icon: ListVideo, path: '/playlist', match: ['/playlist'] },
  { label: 'Download Queue', icon: ListChecks, path: '/queue', match: ['/queue'] },
  { label: 'Downloads', icon: FolderDown, path: '/downloads', match: ['/downloads'] },
  { label: 'Console', icon: Terminal, path: '/console', match: ['/console'] },
  { label: 'Settings', icon: Settings, path: '/settings', match: ['/settings'] },
];

export function AppShell({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, commandPaletteOpen, setCommandPaletteOpen, firstRunComplete } =
    useUIStore();
  const { activeDownloads, totalSpeed, downloads } = useDownloadStore();
  const { settings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const queueCount = downloads.filter(
    (d) => d.status === 'waiting' || d.status === 'downloading' || d.status === 'processing'
  ).length;

  const pageTitle = NAV_ITEMS.find((n) => n.match.some((m) => pathname.startsWith(m)))?.label || 'Dashboard';

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (mod && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        router.push('/queue');
      } else if (mod && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        router.push('/console');
      } else if (mod && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router, setCommandPaletteOpen]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold tracking-tight">Local Downloader</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
          <TooltipProvider delayDuration={200}>
            <ul className="space-y-1 px-2">
              {NAV_ITEMS.map((item) => {
                const isActive = item.match.some((m) => pathname.startsWith(m));
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => router.push(item.path)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground',
                            sidebarCollapsed && 'justify-center'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          {!sidebarCollapsed && isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      )}
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6">
          <h1 className="text-base font-semibold">{pageTitle}</h1>

          {/* Search */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 text-xs md:inline">
              ⌘K
            </kbd>
          </button>

          {/* Status */}
          {activeDownloads > 0 && (
            <button
              onClick={() => router.push('/queue')}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Zap className="h-3.5 w-3.5 animate-pulse-soft" />
              <span>
                Downloading {activeDownloads} {activeDownloads === 1 ? 'item' : 'items'} •{' '}
                {formatSpeed(totalSpeed)}
              </span>
            </button>
          )}

          {queueCount > 0 && (
            <button
              onClick={() => router.push('/queue')}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>{queueCount}</span>
            </button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
            className="h-9 w-9"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      {!firstRunComplete && <FirstRunWizard />}
      <Toaster />
    </div>
  );
}
