import { NextRequest, NextResponse } from 'next/server';
import { detectDependencies } from '@/lib/server/settings';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dep = searchParams.get('dep');

  if (!dep) {
    return NextResponse.json({ success: false, error: { code: 'MISSING_DEP', message: 'Dependency name required' } }, { status: 400 });
  }

  try {
    const deps = await detectDependencies();
    const found = deps.find((d) => d.name === dep);
    if (found && found.found) {
      return NextResponse.json({ success: true, data: found });
    }
    return NextResponse.json({
      success: false,
      error: { code: 'DEP_NOT_FOUND', message: `${dep} was not found` },
    }, { status: 404 });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: { code: 'TEST_FAILED', message: e instanceof Error ? e.message : 'Unknown error' },
    }, { status: 500 });
  }
}
