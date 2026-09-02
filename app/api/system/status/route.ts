import { NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';

export async function GET() {
  const queue = queueManager.getQueue();
  const history = queueManager.getHistory();
  const active = queue.filter((q) => q.status === 'downloading' || q.status === 'processing');
  const waiting = queue.filter((q) => q.status === 'waiting');
  const completed = [...queue, ...history].filter((q) => q.status === 'completed');
  const totalDownloaded = completed.reduce((sum, q) => sum + (q.fileSize || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      uptime: process.uptime(),
      activeDownloads: active.length,
      queuedDownloads: waiting.length,
      totalDownloads: queue.length + history.length,
      totalDownloadedBytes: totalDownloaded,
      diskSpace: null,
    },
  });
}
