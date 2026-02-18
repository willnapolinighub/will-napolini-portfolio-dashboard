import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getAdminClient().from('settings').select('key, value');
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    const settings: Record<string, unknown> = {};
    data?.forEach((item) => { settings[item.key] = item.value; });
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = getAdminClient();

    const upserts = Object.entries(body).map(([key, value]) =>
      client.from('settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    );

    await Promise.all(upserts);
    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
