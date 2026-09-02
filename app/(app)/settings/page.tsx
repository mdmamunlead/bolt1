'use client';

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Settings2,
  Download,
  Film,
  Music,
  ListVideo,
  Subtitles,
  Palette,
  Terminal,
  Save,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VIDEO_FORMATS, VIDEO_QUALITIES, FPS_OPTIONS, AUDIO_FORMATS, AUDIO_BITRATES } from '@/lib/constants';
import type { Settings, ThemeMode, SelectionMode, DependencyInfo } from '@/lib/types';

export default function SettingsPage() {
  const { settings, updateSettings, setSettings } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [deps, setDeps] = useState<DependencyInfo[]>([]);
  const [testingDeps, setTestingDeps] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeps() {
      try {
        const res = await fetch('/api/system/dependencies');
        const data = await res.json();
        if (data.success) setDeps(data.data);
      } catch {
        // ignore
      }
    }
    fetchDeps();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved');
      } else {
        toast.error(data.error?.message || 'Failed to save settings');
      }
    } catch {
      toast.error('Could not connect to backend');
    }
    setSaving(false);
  }

  async function testDep(name: string) {
    setTestingDeps(name);
    try {
      const res = await fetch(`/api/system/test?dep=${name}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`${name} is working`);
        // Refresh deps
        const depRes = await fetch('/api/system/dependencies');
        const depData = await depRes.json();
        if (depData.success) setDeps(depData.data);
      } else {
        toast.error(data.error?.message || `${name} test failed`);
      }
    } catch {
      toast.error('Test failed');
    }
    setTestingDeps(null);
  }

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    updateSettings({ [key]: value } as Partial<Settings>);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Settings
        </h1>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings2 className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="download" className="gap-1.5">
            <Download className="h-4 w-4" /> Download
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1.5">
            <Film className="h-4 w-4" /> Video
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-1.5">
            <Music className="h-4 w-4" /> Audio
          </TabsTrigger>
          <TabsTrigger value="playlist" className="gap-1.5">
            <ListVideo className="h-4 w-4" /> Playlist
          </TabsTrigger>
          <TabsTrigger value="subtitles" className="gap-1.5">
            <Subtitles className="h-4 w-4" /> Subtitles
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="h-4 w-4" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="deps" className="gap-1.5">
            <Terminal className="h-4 w-4" /> Dependencies
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Application behavior and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Startup behavior" description="Which page to show on startup">
                <Select
                  value={settings.startupBehavior}
                  onValueChange={(v) => updateSetting('startupBehavior', v as Settings['startupBehavior'])}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="queue">Queue</SelectItem>
                    <SelectItem value="last">Last visited</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingToggle
                label="Confirm delete"
                description="Ask before deleting downloads"
                checked={settings.confirmDelete}
                onCheckedChange={(v) => updateSetting('confirmDelete', v)}
              />

              <SettingToggle
                label="Auto-detect dependencies"
                description="Check for yt-dlp and FFmpeg on startup"
                checked={settings.autoDetectDeps}
                onCheckedChange={(v) => updateSetting('autoDetectDeps', v)}
              />

              <SettingToggle
                label="Auto refresh"
                description="Automatically refresh data"
                checked={settings.autoRefresh}
                onCheckedChange={(v) => updateSetting('autoRefresh', v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download */}
        <TabsContent value="download" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download Settings</CardTitle>
              <CardDescription>Configure download behavior and paths</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Default output folder" description="Where downloaded files are saved">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={settings.outputFolder}
                      onChange={(e) => updateSetting('outputFolder', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </SettingRow>

              <SettingRow label="Temporary directory" description="For intermediate files during processing">
                <Input
                  value={settings.tempDir}
                  onChange={(e) => updateSetting('tempDir', e.target.value)}
                  placeholder="System default"
                  className="w-64"
                />
              </SettingRow>

              <SettingRow label="Concurrent downloads" description="Maximum simultaneous downloads">
                <Select
                  value={String(settings.concurrentDownloads)}
                  onValueChange={(v) => updateSetting('concurrentDownloads', parseInt(v, 10))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingToggle
                label="Auto-start queue"
                description="Start downloading automatically when items are added"
                checked={settings.autoStartQueue}
                onCheckedChange={(v) => updateSetting('autoStartQueue', v)}
              />

              <SettingToggle
                label="Retry failed downloads"
                description="Automatically retry failed downloads"
                checked={settings.retryFailed}
                onCheckedChange={(v) => updateSetting('retryFailed', v)}
              />

              <SettingRow label="Maximum retries" description="Number of retry attempts">
                <Input
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value, 10) || 0)}
                  className="w-24"
                  min={0}
                  max={10}
                />
              </SettingRow>

              <SettingRow label="Filename template" description="yt-dlp filename template">
                <Input
                  value={settings.filenameTemplate}
                  onChange={(e) => updateSetting('filenameTemplate', e.target.value)}
                  className="w-64"
                />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video */}
        <TabsContent value="video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Video Defaults</CardTitle>
              <CardDescription>Default video download settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Default format" description="Default video container">
                <Select
                  value={settings.defaultVideoFormat}
                  onValueChange={(v) => updateSetting('defaultVideoFormat', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow label="Default quality" description="Default video quality">
                <Select
                  value={settings.defaultVideoQuality}
                  onValueChange={(v) => updateSetting('defaultVideoQuality', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_QUALITIES.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q === 'best' ? 'Best' : q === '2160p' ? '4K' : q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow label="Default FPS" description="Default frame rate preference">
                <Select
                  value={settings.defaultFps}
                  onValueChange={(v) => updateSetting('defaultFps', v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FPS_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f === 'original' ? 'Original' : f === 'highest' ? 'Highest' : `${f} fps`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio */}
        <TabsContent value="audio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audio Defaults</CardTitle>
              <CardDescription>Default audio download settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Default format" description="Default audio format">
                <Select
                  value={settings.defaultAudioFormat}
                  onValueChange={(v) => updateSetting('defaultAudioFormat', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow label="Default bitrate" description="Default audio quality">
                <Select
                  value={settings.defaultAudioBitrate}
                  onValueChange={(v) => updateSetting('defaultAudioBitrate', v)}
                >
                  <SelectTrigger className="w-32">
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
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playlist */}
        <TabsContent value="playlist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Playlist Defaults</CardTitle>
              <CardDescription>Default playlist download settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Default selection mode" description="How videos are selected by default">
                <Select
                  value={settings.defaultSelectionMode}
                  onValueChange={(v) => updateSetting('defaultSelectionMode', v as SelectionMode)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entire">Entire Playlist</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingToggle
                label="Remember last range"
                description="Remember the last used range selection"
                checked={settings.rememberLastRange}
                onCheckedChange={(v) => updateSetting('rememberLastRange', v)}
              />

              <SettingToggle
                label="Default ZIP setting"
                description="Enable ZIP download by default"
                checked={settings.defaultZipSetting}
                onCheckedChange={(v) => updateSetting('defaultZipSetting', v)}
              />

              <SettingToggle
                label="Preserve playlist numbering"
                description="Keep original playlist index in filenames"
                checked={settings.preserveNumbering}
                onCheckedChange={(v) => updateSetting('preserveNumbering', v)}
              />

              <SettingToggle
                label="Renumber selected videos"
                description="Renumber selected videos starting from 001"
                checked={settings.renumberSelected}
                onCheckedChange={(v) => updateSetting('renumberSelected', v)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subtitles */}
        <TabsContent value="subtitles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subtitles</CardTitle>
              <CardDescription>Subtitle download settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                label="Download subtitles"
                description="Download subtitles with videos"
                checked={settings.downloadSubtitles}
                onCheckedChange={(v) => updateSetting('downloadSubtitles', v)}
              />

              <SettingToggle
                label="Embed subtitles"
                description="Embed subtitles into the video file"
                checked={settings.embedSubtitles}
                onCheckedChange={(v) => updateSetting('embedSubtitles', v)}
              />

              <SettingRow label="Default language" description="Subtitle language code">
                <Input
                  value={settings.subtitleLang}
                  onChange={(e) => updateSetting('subtitleLang', e.target.value)}
                  className="w-32"
                  placeholder="en"
                />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow label="Theme" description="Choose light, dark, or system theme">
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setTheme(t);
                        updateSetting('theme', t);
                      }}
                      className="gap-1.5 capitalize"
                    >
                      {t === 'light' && <Sun className="h-4 w-4" />}
                      {t === 'dark' && <Moon className="h-4 w-4" />}
                      {t === 'system' && <Monitor className="h-4 w-4" />}
                      {t}
                    </Button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Accent color" description="Primary accent color">
                <div className="flex gap-2">
                  {['blue', 'green', 'orange', 'red', 'teal'].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateSetting('accentColor', c)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-all',
                        settings.accentColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </SettingRow>

              <SettingRow label="Sidebar style" description="Expanded or compact sidebar">
                <Select
                  value={settings.sidebarStyle}
                  onValueChange={(v) => updateSetting('sidebarStyle', v as 'expanded' | 'compact')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Expanded</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingToggle
                label="Compact mode"
                description="Reduce padding and spacing"
                checked={settings.compactMode}
                onCheckedChange={(v) => updateSetting('compactMode', v)}
              />

              <SettingRow label="UI density" description="Spacing density">
                <Select
                  value={settings.uiDensity}
                  onValueChange={(v) => updateSetting('uiDensity', v as 'comfortable' | 'compact')}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow label="Border radius" description="Corner roundness">
                <div className="flex items-center gap-3 w-48">
                  <Slider
                    value={[settings.borderRadius]}
                    onValueChange={(v) => updateSetting('borderRadius', v[0])}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <span className="w-12 text-xs text-muted-foreground">
                    {settings.borderRadius.toFixed(1)}rem
                  </span>
                </div>
              </SettingRow>

              <SettingRow label="Animation intensity" description="Level of UI animations">
                <Select
                  value={settings.animationIntensity}
                  onValueChange={(v) => updateSetting('animationIntensity', v as 'none' | 'subtle' | 'full')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependencies */}
        <TabsContent value="deps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependencies</CardTitle>
              <CardDescription>System tools required for downloading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deps.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                deps.map((dep) => (
                  <div key={dep.name} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {dep.found ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{dep.name}</p>
                          {dep.version && (
                            <p className="text-xs text-muted-foreground">Version: {dep.version}</p>
                          )}
                          {dep.path && (
                            <p className="text-xs text-muted-foreground">Path: {dep.path}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testDep(dep.name)}
                          disabled={testingDeps === dep.name}
                          className="gap-1.5"
                        >
                          {testingDeps === dep.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Terminal className="h-4 w-4" />
                          )}
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Custom paths */}
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-semibold">Custom Executable Paths</h3>
                <SettingRow label="yt-dlp path" description="Custom path to yt-dlp executable">
                  <Input
                    value={settings.ytdlpPath}
                    onChange={(e) => updateSetting('ytdlpPath', e.target.value)}
                    placeholder="Auto-detect"
                    className="w-64"
                  />
                </SettingRow>
                <SettingRow label="FFmpeg path" description="Custom path to FFmpeg executable">
                  <Input
                    value={settings.ffmpegPath}
                    onChange={(e) => updateSetting('ffmpegPath', e.target.value)}
                    placeholder="Auto-detect"
                    className="w-64"
                  />
                </SettingRow>
                <SettingRow label="FFprobe path" description="Custom path to FFprobe executable">
                  <Input
                    value={settings.ffprobePath}
                    onChange={(e) => updateSetting('ffprobePath', e.target.value)}
                    placeholder="Auto-detect"
                    className="w-64"
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
