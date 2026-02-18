import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Public anon client — respects RLS
// Safe for client components and public reads
// ============================================
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export const supabase = {
  get auth() { return getSupabaseClient().auth; },
  get from() { return getSupabaseClient().from.bind(getSupabaseClient()); },
};

// ============================================
// Main admin client — bypasses RLS (main DB)
// ONLY use in API route handlers (server-side)
// ============================================
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('[Admin] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key.');
    return getSupabaseClient();
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================
// Named admin client — per data-type DB support
//
// Priority:
//   1. Type-specific env vars  (POSTS_SUPABASE_URL + POSTS_SERVICE_ROLE_KEY)
//   2. Fallback to main admin client
//
// This lets you keep posts, products, subscribers,
// and analytics in separate Supabase projects for
// data isolation, while falling back to the main DB
// if a separate project isn't configured.
// ============================================
type DbType = 'posts' | 'products' | 'subscribers' | 'analytics';

const ENV_MAP: Record<DbType, { url: string; key: string }> = {
  posts:       { url: 'POSTS_SUPABASE_URL',       key: 'POSTS_SERVICE_ROLE_KEY' },
  products:    { url: 'PRODUCTS_SUPABASE_URL',     key: 'PRODUCTS_SERVICE_ROLE_KEY' },
  subscribers: { url: 'SUBSCRIBERS_SUPABASE_URL',  key: 'SUBSCRIBERS_SERVICE_ROLE_KEY' },
  analytics:   { url: 'ANALYTICS_SUPABASE_URL',    key: 'ANALYTICS_SERVICE_ROLE_KEY' },
};

export function getNamedAdminClient(type: DbType): SupabaseClient {
  const { url: urlKey, key: roleKey } = ENV_MAP[type];
  const url = process.env[urlKey];
  const serviceKey = process.env[roleKey];

  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // Fall back to the main admin client
  return getAdminClient();
}

export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ============================================
// Database Row Types
// ============================================

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  image: string | null;
  category: 'Mindset' | 'Skillset' | 'Toolset' | null;
  ai_prompt: string | null;
  published: boolean;
  read_time: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: 'Mindset' | 'Skillset' | 'Toolset' | null;
  price: string | null;
  original_price: string | null;
  stripe_link: string | null;
  ai_prompt: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
