import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';
import { getSettings, validateUrl } from '@/lib/server/settings';
import { generateId } from '@/lib/constants';
import type { DownloadItem } from '@/lib/types';

// POST - add item(s) to queue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = getSettings();

    // Check if this is a playlist batch
    if (body.items && Array.isArray(body.items)) {
      const items: DownloadItem[] = body.items.map((entry: any) => {
        const id = entry.id || generateId();
        return {
          id,
          url: entry.url,
          title: entry.title || 'Unknown',
          thumbnail: null,
          type: body.type || 'video',
          format: body.format || 'mp4',
          quality: body.quality || 'best',
          status: 'waiting',
          progress: 0,
          speed: 0,
          eta: 0,
          fileSize: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          playlistIndex: entry.playlistIndex || null,
          playlistId: body.playlistId || null,
          outputDir: body.outputDir || settings.outputFolder || '',
          filename: '',
          error: null,
          createdAt: Date.now(),
          startedAt: null,
          completedAt: null,
          embedThumbnail: false,
          embedMetadata: false,
          downloadSubtitles: false,
          embedSubtitles: false,
          subtitleLang: 'en',
          audioCodec: body.type === 'audio' ? body.format : 'best',
          audioBitrate: body.type === 'audio' ? body.quality : 'best',
          fps: '',
          isZip: !!body.enableZip,
        };
      });

      queueManager.addMany(items);
      return NextResponse.json({ success: true, data: { count: items.length } });
    }

    // Single item
    const { url, type, format, quality, id } = body;
    if (!url || !validateUrl(url)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Please provide a valid URL' },
      }, { status: 400 });
    }

    const downloadId = id || generateId();
    const item: DownloadItem = {
      id: downloadId,
      url,
      title: 'Queued',
      thumbnail: null,
      type,
      format: format || 'mp4',
      quality: quality || 'best',
      status: 'waiting',
      progress: 0,
      speed: 0,
      eta: 0,
      fileSize: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      playlistIndex: null,
      playlistId: null,
      outputDir: settings.outputFolder || '',
      filename: '',
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      embedThumbnail: false,
      embedMetadata: false,
      downloadSubtitles: false,
      embedSubtitles: false,
      subtitleLang: 'en',
      audioCodec: 'best',
      audioBitrate: 'best',
      fps: 'original',
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

// GET - retrieve current queue
export async function GET() {
  try {
    const queue = queueManager.getQueue();
    return NextResponse.json({ success: true, data: queue });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
