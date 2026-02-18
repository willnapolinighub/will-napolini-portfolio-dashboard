import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

const defaultSettings = {
  provider: 'ollama' as const,
  model: 'qwen3:0.6b',
  endpoint: 'http://127.0.0.1:11434/api/chat',
  apiKey: '',
  systemPrompt: "You are a helpful AI assistant. Be friendly, helpful, and concise.",
  enableProductChat: true,
  enableBlogChat: true,
};

export async function GET() {
  try {
    const { data, error } = await getAdminClient()
      .from('settings')
      .select('value')
      .eq('key', 'chat_ai')
      .single();

    if (error || !data) {
      return NextResponse.json({ success: true, settings: defaultSettings, source: 'default' });
    }
    return NextResponse.json({ success: true, settings: data.value, source: 'supabase' });
  } catch {
    return NextResponse.json({ success: true, settings: defaultSettings, source: 'default' });
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();

    const { error } = await getAdminClient()
      .from('settings')
      .upsert(
        { key: 'chat_ai', value: settings, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings saved', settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
