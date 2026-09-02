import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';
import { getSettings, validateUrl } from '@/lib/server/settings';
import { generateId } from '@/lib/constants';
import type { DownloadItem } from '@/lib/types';

// POST - start a direct download (not queued)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type, format, quality, fps, audioCodec, audioBitrate, embedThumbnail, embedMetadata, downloadSubtitles, embedSubtitles, subtitleLang, filenameTemplate, outputDir, customOptions, id } = body;

    if (!url || !validateUrl(url)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Please provide a valid URL' },
      }, { status: 400 });
    }

    const settings = getSettings();
    const downloadId = id || generateId();

    const item: DownloadItem = {
      id: downloadId,
      url,
      title: 'Fetching...',
      thumbnail: null,
      type,
      format: format || 'mp4',
      quality: quality || 'best',
      status: 'downloading',
      progress: 0,
      speed: 0,
      eta: 0,
      fileSize: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      playlistIndex: null,
      playlistId: null,
      outputDir: outputDir || settings.outputFolder || '',
      filename: '',
      error: null,
      createdAt: Date.now(),
      startedAt: Date.now(),
      completedAt: null,
      embedThumbnail: !!embedThumbnail,
      embedMetadata: !!embedMetadata,
      downloadSubtitles: !!downloadSubtitles,
      embedSubtitles: !!embedSubtitles,
      subtitleLang: subtitleLang || 'en',
      audioCodec: audioCodec || 'best',
      audioBitrate: audioBitrate || 'best',
      fps: fps || 'original',
      isZip: false,
    };

    queueManager.add(item);
    return NextResponse.json({ success: true, data: { id: downloadId } });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}

// GET - retrieve download history
export async function GET() {
  try {
    const history = queueManager.getHistory();
    const queue = queueManager.getQueue();
    // Combine queue + history, deduplicated
    const all = [...queue];
    const queueIds = new Set(queue.map((q) => q.id));
    for (const h of history) {
      if (!queueIds.has(h.id)) all.push(h);
    }
    return NextResponse.json({ success: true, data: all });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}

// DELETE - remove from history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_ID', message: 'Download ID is required' },
      }, { status: 400 });
    }

    queueManager.remove(id);
    queueManager.deleteFromHistory(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
