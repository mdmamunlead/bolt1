'use client';

import { useRouter } from 'next/navigation';
import {
  Video,
  Music,
  ListVideo,
  ListChecks,
  FolderDown,
  Terminal,
  Settings,
  Play,
  Pause,
  Trash2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDownloadStore } from '@/stores/download-store';
import { toast } from 'sonner';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const downloads = useDownloadStore((s) => s.downloads);
  const clearCompleted = useDownloadStore((s) => s.clearCompleted);
  const clearFailed = useDownloadStore((s) => s.clearFailed);

  const navigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const startAll = async () => {
    onOpenChange(false);
    try {
      await fetch('/api/queue/start-all', { method: 'POST' });
      toast.success('Started all downloads');
    } catch {
      toast.error('Failed to start downloads');
    }
  };

  const pauseAll = async () => {
    onOpenChange(false);
    try {
      await fetch('/api/queue/pause-all', { method: 'POST' });
      toast.success('Paused all downloads');
    } catch {
      toast.error('Failed to pause downloads');
    }
  };

  const doClearCompleted = () => {
    onOpenChange(false);
    clearCompleted();
    toast.success('Cleared completed downloads');
  };

  const doClearFailed = () => {
    onOpenChange(false);
    clearFailed();
    toast.success('Cleared failed downloads');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Downloads">
          <CommandItem onSelect={() => navigate('/video')}>
            <Video className="mr-2 h-4 w-4" />
            New Video Download
          </CommandItem>
          <CommandItem onSelect={() => navigate('/audio')}>
            <Music className="mr-2 h-4 w-4" />
            New Audio Download
          </CommandItem>
          <CommandItem onSelect={() => navigate('/playlist')}>
            <ListVideo className="mr-2 h-4 w-4" />
            New Playlist Download
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/dashboard')}>
            <FolderDown className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate('/queue')}>
            <ListChecks className="mr-2 h-4 w-4" />
            Open Queue
          </CommandItem>
          <CommandItem onSelect={() => navigate('/downloads')}>
            <FolderDown className="mr-2 h-4 w-4" />
            Open Downloads
          </CommandItem>
          <CommandItem onSelect={() => navigate('/console')}>
            <Terminal className="mr-2 h-4 w-4" />
            Open Console
          </CommandItem>
          <CommandItem onSelect={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Open Settings
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={startAll}>
            <Play className="mr-2 h-4 w-4" />
            Start All
          </CommandItem>
          <CommandItem onSelect={pauseAll}>
            <Pause className="mr-2 h-4 w-4" />
            Pause All
          </CommandItem>
          <CommandItem onSelect={doClearCompleted}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Completed
          </CommandItem>
          <CommandItem onSelect={doClearFailed}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Failed
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
