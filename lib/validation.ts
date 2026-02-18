import { z } from 'zod';

// ── Auth Schemas ────────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address').max(255);

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// ── Post Schemas ─────────────────────────────────────────────────

export const categorySchema = z.enum(['Mindset', 'Skillset', 'Toolset']);

export const postCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  image: z.string().url('Invalid image URL').max(500).optional().or(z.literal('')),
  category: categorySchema.optional(),
  ai_prompt: z.string().max(5000).optional(),
  published: z.boolean().optional(),
  read_time: z.string().max(50).optional(),
});

export const postUpdateSchema = postCreateSchema.partial();

// ── Product Schemas ──────────────────────────────────────────────

export const productCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  image: z.string().url('Invalid image URL').max(500).optional().or(z.literal('')),
  category: categorySchema.optional(),
  price: z.string().max(50).optional(),
  original_price: z.string().max(50).optional(),
  // New Stripe integration fields
  price_cents: z.number().int().min(0, 'Price must be 0 or greater').optional(),
  original_price_cents: z.number().int().min(0, 'Original price must be 0 or greater').optional(),
  currency: z.string().length(3, 'Currency must be 3 letters (e.g., usd)').default('usd'),
  sync_to_stripe: z.boolean().optional(),
  // Legacy fields
  stripe_link: z.string().url('Invalid Stripe link').max(500).optional().or(z.literal('')),
  ai_prompt: z.string().max(5000).optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

// Stripe sync schema for API calls
export const stripeSyncSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  forceResync: z.boolean().optional(),
});

// ── Subscriber Schemas ───────────────────────────────────────────

export const subscribeSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
});

// ── Chat Schemas ─────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(10000),
});

export const chatContextSchema = z.object({
  type: z.enum(['product', 'blog']),
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  price: z.string().max(50).optional(),
  aiPrompt: z.string().max(5000).optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: chatContextSchema.optional(),
});

// ── Settings Schemas ─────────────────────────────────────────────

export const profileSettingsSchema = z.object({
  name: z.string().max(100),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().max(500).optional().or(z.literal('')),
});

export const chatSettingsSchema = z.object({
  provider: z.enum(['ollama', 'openai', 'anthropic']),
  model: z.string().max(100),
  endpoint: z.string().url().max(500).optional().or(z.literal('')),
  apiKey: z.string().max(200).optional(), // Note: should be encrypted in DB
  systemPrompt: z.string().max(5000).optional(),
  enableProductChat: z.boolean().optional(),
  enableBlogChat: z.boolean().optional(),
});

export const contactSettingsSchema = z.object({
  email: z.string().email().max(200).optional().or(z.literal('')),
  telegram: z.string().max(100).optional(),
  whatsapp: z.string().max(100).optional(),
  instagram: z.string().max(100).optional(),
});

// ── Helper Functions ─────────────────────────────────────────────

import { NextResponse } from 'next/server';

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: NextResponse };

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return {
      success: false,
      error: NextResponse.json(
        { success: false, error: `Validation error: ${errors}` },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate UUID format
 */
export const uuidSchema = z.string().uuid('Invalid ID format');