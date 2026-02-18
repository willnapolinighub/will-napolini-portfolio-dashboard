import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/tenant';
import { getNamedAdminClient, getAdminClient } from '@/lib/supabase';
/**
 * Public API — consumed by external frontend apps.
 * Requires API key via Authorization header or X-Api-Key header.
 *
 * GET /api/public?resource=posts[&category=Mindset&limit=20&offset=0]
 * GET /api/public?resource=post&id=uuid
 * GET /api/public?resource=post&slug=my-post-slug
 * GET /api/public?resource=products[&category=Mindset]
 * GET /api/public?resource=product&id=uuid
 * GET /api/public?resource=settings
 */

export async function GET(request: NextRequest) {
  const authHeader =
    request.headers.get('Authorization') || request.headers.get('X-Api-Key');
  const { valid, tenant } = validateApiKey(authHeader);

  if (!valid || !tenant) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization or X-Api-Key header.' },
      { status: 401 }
    );
  }

  const params = request.nextUrl.searchParams;
  const resource = params.get('resource') || 'posts';

  try {
    let data: unknown = null;

    switch (resource) {
      case 'posts':
        data = await fetchPosts(params);
        break;
      case 'post':
        data = await fetchPost(params);
        break;
      case 'products':
        data = await fetchProducts(params);
        break;
      case 'product':
        data = await fetchProduct(params);
        break;
      case 'settings':
        data = await fetchSettings();
        break;
      default:
        return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant: tenant.slug, data });
  } catch (error) {
    console.error(`[Public API] ${resource} error:`, error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// ── Fetch helpers ──────────────────────────────────────────────

async function fetchPosts(params: URLSearchParams) {
  const client = getNamedAdminClient('posts');
  const category = params.get('category');
  const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
  const offset = parseInt(params.get('offset') || '0');

  let query = client
    .from('posts')
    .select('id, title, slug, description, image, category, created_at, read_time, views')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function fetchPost(params: URLSearchParams) {
  const client = getNamedAdminClient('posts');
  const id = params.get('id');
  const slug = params.get('slug');

  if (!id && !slug) throw new Error('Provide id or slug parameter');

  let query = client.from('posts').select('*').eq('published', true);
  if (id) query = query.eq('id', id);
  else if (slug) query = query.eq('slug', slug);

  const { data, error } = await query.single();
  if (error) throw error;

  // Increment view count asynchronously (fire-and-forget)
  if (data?.id) {
    void Promise.resolve(client.rpc('increment_post_views', { post_id: data.id }));
  }

  return data;
}

async function fetchProducts(params: URLSearchParams) {
  const client = getNamedAdminClient('products');
  const category = params.get('category');

  let query = client
    .from('products')
    .select('id, title, description, image, category, price, original_price, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function fetchProduct(params: URLSearchParams) {
  const client = getNamedAdminClient('products');
  const id = params.get('id');
  if (!id) throw new Error('Provide id parameter');

  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single();

  if (error) throw error;
  return data;
}

async function fetchSettings() {
  const client = getAdminClient();
  const { data, error } = await client.from('settings').select('key, value');
  if (error) throw error;

  const settings: Record<string, unknown> = {};
  data?.forEach((item: { key: string; value: unknown }) => { settings[item.key] = item.value; });
  return settings;
}
