import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = queueManager.getItem(params.id);
  if (!item) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Download not found' } }, { status: 404 });
  }
  const fullPath = path.join(item.outputDir, item.filename);
  return NextResponse.json({ success: true, data: { path: fullPath } });
}
