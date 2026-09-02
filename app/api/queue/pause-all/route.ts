import { NextResponse } from 'next/server';
import { queueManager } from '@/lib/server/queue';

export async function POST() {
  queueManager.pauseAll();
  return NextResponse.json({ success: true });
}
