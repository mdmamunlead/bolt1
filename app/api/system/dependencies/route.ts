import { NextResponse } from 'next/server';
import { detectDependencies } from '@/lib/server/settings';

export async function GET() {
  try {
    const deps = await detectDependencies();
    return NextResponse.json({ success: true, data: deps });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'DETECTION_FAILED', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
