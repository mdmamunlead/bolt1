import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ok = queueManager.pause(params.id);
  return NextResponse.json({ success: ok });
}
