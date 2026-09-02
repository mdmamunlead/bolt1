import { NextRequest, NextResponse } from 'next/server';
import { openFolder } from '@/lib/server/filesystem';
import { queueManager } from '@/lib/server/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = queueManager.getItem(params.id);
  if (!item) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Download not found' } }, { status: 404 });
  }
  const result = openFolder(item.outputDir);
  return NextResponse.json({ success: result.success, error: result.error ? { code: 'OPEN_FAILED', message: result.error } : undefined });
}
