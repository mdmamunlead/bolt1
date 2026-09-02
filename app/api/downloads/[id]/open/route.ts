import { NextRequest, NextResponse } from 'next/server';
import { openFile, openFolder, deleteFile } from '@/lib/server/filesystem';
import { queueManager } from '@/lib/server/queue';

// POST /api/downloads/:id/open - open the file
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = queueManager.getItem(params.id);
  if (!item) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Download not found' } }, { status: 404 });
  }
  const result = openFile(item.outputDir + '/' + item.filename);
  return NextResponse.json({ success: result.success, error: result.error ? { code: 'OPEN_FAILED', message: result.error } : undefined });
}
