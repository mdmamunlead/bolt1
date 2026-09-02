'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderOpen,
  Palette,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUIStore } from '@/stores/ui-store';
import { useSettingsStore } from '@/stores/settings-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'welcome' | 'deps' | 'folder' | 'theme' | 'done';

export function FirstRunWizard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { setFirstRunComplete } = useUIStore();
  const { settings, updateSettings } = useSettingsStore();
  const [step, setStep] = useState<Step>('welcome');
  const [deps, setDeps] = useState<{ ytdlp: boolean; ffmpeg: boolean; node: boolean }>({
    ytdlp: false,
    ffmpeg: false,
    node: false,
  });
  const [checking, setChecking] = useState(false);
  const [folder, setFolder] = useState(settings.outputFolder || '');

  async function checkDeps() {
    setChecking(true);
    try {
      const res = await fetch('/api/system/dependencies');
      const data = await res.json();
      if (data.success && data.data) {
        setDeps({
          ytdlp: data.data.some((d: { name: string; found: boolean }) => d.name === 'yt-dlp' && d.found),
          ffmpeg: data.data.some((d: { name: string; found: boolean }) => d.name === 'ffmpeg' && d.found),
          node: data.data.some((d: { name: string; found: boolean }) => d.name === 'node' && d.found),
        });
      }
    } catch {
      // server may not be ready
    }
    setChecking(false);
  }

  async function saveFolderAndFinish() {
    updateSettings({ outputFolder: folder });
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, outputFolder: folder }),
      });
    } catch {
      // ignore
    }
    setFirstRunComplete(true);
    toast.success('Setup complete! Welcome to Local Downloader.');
    router.push('/dashboard');
  }

  const steps: Step[] = ['welcome', 'deps', 'folder', 'theme', 'done'];
  const currentIdx = steps.indexOf(step);

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {step === 'welcome' && 'Welcome to Local Downloader'}
            {step === 'deps' && 'Dependency Check'}
            {step === 'folder' && 'Choose Download Directory'}
            {step === 'theme' && 'Choose Theme'}
            {step === 'done' && 'Setup Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-2 py-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= currentIdx ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This application downloads videos, audio, and playlists locally using yt-dlp and FFmpeg.
              Let&apos;s set up a few things to get you started.
            </p>
            <Button onClick={() => { setStep('deps'); checkDeps(); }} className="w-full">
              Get Started
            </Button>
          </div>
        )}

        {step === 'deps' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <DepRow name="yt-dlp" found={deps.ytdlp} checking={checking} />
              <DepRow name="FFmpeg" found={deps.ffmpeg} checking={checking} />
              <DepRow name="Node.js" found={deps.node} checking={checking} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkDeps} disabled={checking} className="flex-1">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Re-check'}
              </Button>
              <Button onClick={() => setStep('folder')} className="flex-1">
                Continue
              </Button>
            </div>
            {!deps.ytdlp || !deps.ffmpeg ? (
              <p className="text-xs text-muted-foreground">
                You can configure custom paths later in Settings. yt-dlp and FFmpeg are required for downloads.
              </p>
            ) : null}
          </div>
        )}

        {step === 'folder' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Default download folder</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder="/home/user/Downloads"
                    className="pl-10"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This is where downloaded files will be saved. You can change this later in Settings.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('deps')} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('theme')} disabled={!folder} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'theme' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <ThemeCard label="Light" icon={Sun} active={theme === 'light'} onClick={() => setTheme('light')} />
              <ThemeCard label="Dark" icon={Moon} active={theme === 'dark'} onClick={() => setTheme('dark')} />
              <ThemeCard label="System" icon={Monitor} active={theme === 'system'} onClick={() => setTheme('system')} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('folder')} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('done')} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="text-sm text-muted-foreground">
              You&apos;re all set! Click below to start using Local Downloader.
            </p>
            <Button onClick={saveFolderAndFinish} className="w-full">
              Open Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DepRow({ name, found, checking }: { name: string; found: boolean; checking: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <span className="text-sm font-medium">{name}</span>
      {checking ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : found ? (
        <span className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Detected
        </span>
      ) : (
        <span className="flex items-center gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4" />
          Not found
        </span>
      )}
    </div>
  );
}

function ThemeCard({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
