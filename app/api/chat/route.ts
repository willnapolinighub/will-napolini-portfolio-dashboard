import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';
import { validateBody, chatRequestSchema } from '@/lib/validation';
import logger from '@/lib/logger';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    type: 'product' | 'blog';
    title: string;
    description?: string;
    category?: string;
    price?: string;
    aiPrompt?: string;
  };
  // NOTE: client apps must NOT send apiKey — the server reads it from env/DB
}

interface ChatSettings {
  provider: 'ollama' | 'openai' | 'anthropic';
  model: string;
  endpoint: string;
  apiKey: string;
  systemPrompt: string;
  enableProductChat: boolean;
  enableBlogChat: boolean;
}

const DEFAULT_SETTINGS: ChatSettings = {
  provider: 'ollama',
  model: 'qwen3:0.6b',
  endpoint: 'http://127.0.0.1:11434/api/chat',
  apiKey: '',
  systemPrompt: "/no_think\nYou are a helpful AI assistant. Be friendly, helpful, and concise.",
  enableProductChat: true,
  enableBlogChat: true,
};

// ── Tool Schema injected into system prompt ───────────────────────────────────
const TOOL_SCHEMA = `
You have access to the following admin tools. When the user asks you to perform one of these actions, respond with a <tool_call> block containing valid JSON, then continue your message normally.

Format:
<tool_call>{"tool":"TOOL_ID","params":{...}}</tool_call>

Available tools:

1. get_posts — Fetch all published blog posts
   <tool_call>{"tool":"get_posts","params":{}}</tool_call>

2. get_products — Fetch all active products
   <tool_call>{"tool":"get_products","params":{}}</tool_call>

3. create_post — Create a new blog post
   Required params: title (string), category ("Mindset"|"Skillset"|"Toolset")
   Optional params: content (string), description (string)
   <tool_call>{"tool":"create_post","params":{"title":"...","category":"Mindset","content":"...","description":"..."}}</tool_call>

4. create_product — Create a new product
   Required params: title (string), price (string), category ("Mindset"|"Skillset"|"Toolset")
   Optional params: description (string)
   <tool_call>{"tool":"create_product","params":{"title":"...","price":"29","category":"Toolset","description":"..."}}</tool_call>

5. delete_post — Delete a post by its UUID
   Required params: id (string)
   <tool_call>{"tool":"delete_post","params":{"id":"uuid-here"}}</tool_call>

Rules:
- Only emit ONE <tool_call> per response.
- Always confirm what you did after the tool result is shown.
- If the user asks to "list posts" or "show posts", use get_posts.
- Only use tools when the user explicitly requests an admin action (list, create, delete).
- NEVER use tools for text generation tasks such as writing titles, descriptions, prompts, or any content. For those tasks, respond with plain text only.
- If asked to "generate", "write", "create text for", or "suggest" any content — respond with plain text, no tool calls.
`;

async function getChatSettings(): Promise<ChatSettings> {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', 'chat_ai')
      .single();

    if (error || !data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(data.value as ChatSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Resolve the API key — NEVER from the client request.
 * Priority: Supabase settings → env vars
 */
function resolveApiKey(provider: string, settingsKey: string): string {
  if (settingsKey) return settingsKey;
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  return '';
}

// ── n8n Tool Executor (server-side only) ──────────────────────────────────────
async function executeToolCall(toolId: string, params: Record<string, unknown>): Promise<unknown> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL is not configured on the server. Add it to .env.local');
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: toolId, params }),
  });
  if (!res.ok) {
    throw new Error(`n8n webhook returned ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  if (!text.trim()) throw new Error('n8n webhook returned an empty response');
  return JSON.parse(text);
}

/** Extract the first <tool_call>...</tool_call> block from an AI response */
function parseToolCall(response: string): { toolId: string; params: Record<string, unknown>; cleanText: string } | null {
  const match = response.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  if (!match) return null;
  try {
    const { tool, params } = JSON.parse(match[1]);
    if (!tool) return null;
    const cleanText = response.replace(/<tool_call>[\s\S]*?<\/tool_call>/, '').trim();
    return { toolId: tool, params: params || {}, cleanText };
  } catch {
    return null;
  }
}

async function callOllama(messages: ChatMessage[], endpoint: string, model: string): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      think: false, // Disable thinking mode for Qwen3 models
      options: { temperature: 0.7, num_predict: 1000 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  const content = data.message?.content || 'No response from Ollama';
  // Strip <think>...</think> blocks (Qwen3 chain-of-thought)
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

async function callOpenAI(messages: ChatMessage[], endpoint: string, model: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key not configured on the server');
  const response = await fetch(endpoint || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1000 }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from OpenAI';
}

async function callAnthropic(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Anthropic API key not configured on the server');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: messages.find((m) => m.role === 'system')?.content,
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error: ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || 'No response from Anthropic';
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimit = rateLimiters.chat(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    const body = await request.json();
    
    // Input validation
    const validation = validateBody(chatRequestSchema, body);
    if (!validation.success) {
      return validation.error;
    }
    
    const { messages, context } = validation.data;

    // Always fetch settings server-side — API keys never come from the client
    const settings = await getChatSettings();
    const apiKey = resolveApiKey(settings.provider, settings.apiKey);

    // Build system prompt: base + tool schema + optional context
    let systemPrompt = (settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt) + '\n\n' + TOOL_SCHEMA;

    if (context) {
      if (context.type === 'product') {
        systemPrompt += `\n\nCurrent product context:\nTitle: "${context.title}"\nCategory: ${context.category || 'General'}\n${context.price ? `Price: ${context.price}` : ''}\n${context.description ? `Description: ${context.description}` : ''}\n${context.aiPrompt ? `\nProduct details:\n${context.aiPrompt}` : ''}`;
      } else if (context.type === 'blog') {
        systemPrompt += `\n\nCurrent blog post context:\nTitle: "${context.title}"\nCategory: ${context.category || 'General'}\n${context.description ? `Description: ${context.description}` : ''}\n${context.aiPrompt ? `\nKey insights:\n${context.aiPrompt}` : ''}`;
      }
    }

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    // ── Call the LLM ──────────────────────────────────────────────────────────
    let aiResponse: string;
    switch (settings.provider) {
      case 'openai':
        aiResponse = await callOpenAI(fullMessages, settings.endpoint, settings.model, apiKey);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(fullMessages, settings.model, apiKey);
        break;
      case 'ollama':
      default:
        aiResponse = await callOllama(fullMessages, settings.endpoint, settings.model);
        break;
    }

    // ── Server-side tool call detection + execution ───────────────────────────
    const toolCall = parseToolCall(aiResponse);
    if (toolCall && process.env.N8N_WEBHOOK_URL) {
      try {
        const toolResult = await executeToolCall(toolCall.toolId, toolCall.params);

        // Return both the clean AI text and the structured tool result
        return NextResponse.json({
          success: true,
          response: toolCall.cleanText,
          toolResult: {
            toolId: toolCall.toolId,
            data: toolResult,
          },
          provider: settings.provider,
        });
      } catch (toolErr) {
        // Tool call failed — still return the AI response + error info
        return NextResponse.json({
          success: true,
          response: toolCall.cleanText,
          toolResult: {
            toolId: toolCall.toolId,
            error: toolErr instanceof Error ? toolErr.message : 'Tool call failed',
          },
          provider: settings.provider,
        });
      }
    }

    // No tool call — plain chat response
    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider: settings.provider,
    });
  } catch (error) {
    logger.exception(error instanceof Error ? error : new Error(String(error)), 'Chat API');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get AI response' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
