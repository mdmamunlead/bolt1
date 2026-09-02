import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/server/event-bus';

export async function GET() {
  const logs = eventBus.getLogs();
  return NextResponse.json({ success: true, data: logs });
}
