import { NextRequest, NextResponse } from 'next/server';
import { fetchMetadata } from '@/lib/server/ytdlp';
import { validateUrl } from '@/lib/server/settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || !validateUrl(url)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Please provide a valid URL' },
      }, { status: 400 });
    }

    const result = await fetchMetadata(url);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
