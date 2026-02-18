/**
 * Server-side proxy for n8n admin tool execution.
 * Client calls this → server calls N8N_WEBHOOK_URL (never exposed to browser).
 *
 * POST body: { tool: string, params: Record<string, unknown> }
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, params } = body;

    if (!tool) {
      return NextResponse.json({ success: false, error: 'Missing tool name' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'N8N_WEBHOOK_URL not configured on server. Add it to .env.local' },
        { status: 500 }
      );
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, params: params || {} }),
    });

    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: `n8n webhook returned empty response (status ${res.status})` },
        { status: 502 }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[Tool Call API]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Tool execution failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
