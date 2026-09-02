import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = queueManager.remove(params.id);
  return NextResponse.json({ success: ok });
}
