import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/server/settings';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import type { Settings } from '@/lib/types';

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = getSettings();
    const updated: Settings = { ...DEFAULT_SETTINGS, ...current, ...body };
    saveSettings(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SAVE_FAILED', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
