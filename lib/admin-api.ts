import { BlogPost, ShopProduct } from './types';
import { getNamedAdminClient } from './supabase';
import { mapPostRowToBlogPost, mapProductRowToShopProduct } from './mappers';

// ============================================
// Posts API  →  uses POSTS DB (or main DB fallback)
// ============================================

export async function getAdminPosts(): Promise<BlogPost[]> {
  const client = getNamedAdminClient('posts');
  const { data, error } = await client
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching posts:', error); return []; }
  return data.map(mapPostRowToBlogPost);
}

export async function getAdminPostById(id: string): Promise<BlogPost | null> {
  const client = getNamedAdminClient('posts');
  const { data, error } = await client.from('posts').select('*').eq('id', id).single();
  if (error) { console.error('Error fetching post:', error); return null; }
  return mapPostRowToBlogPost(data);
}

export async function createPost(post: {
  title: string; slug: string; description?: string; content?: string;
  image?: string; category: 'Mindset' | 'Skillset' | 'Toolset';
  ai_prompt?: string; read_time?: string; published?: boolean;
}): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  const client = getNamedAdminClient('posts');
  const { data, error } = await client
    .from('posts')
    .insert([{
      title: post.title, slug: post.slug,
      description: post.description || '', content: post.content || '',
      image: post.image || '', category: post.category,
      ai_prompt: post.ai_prompt || '', read_time: post.read_time || '5 min read',
      published: post.published ?? true, views: 0,
    }])
    .select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: mapPostRowToBlogPost(data) };
}

export async function updatePost(
  id: string,
  updates: Partial<{
    title: string; slug: string; description: string; content: string;
    image: string; category: 'Mindset' | 'Skillset' | 'Toolset';
    ai_prompt: string; read_time: string; published: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const client = getNamedAdminClient('posts');
  const { error } = await client.from('posts').update(updates).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function incrementPostViews(id: string): Promise<void> {
  const client = getNamedAdminClient('posts');
  await client.rpc('increment_post_views', { post_id: id });
}

export async function deletePost(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getNamedAdminClient('posts');
  const { error } = await client.from('posts').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Products API  →  uses PRODUCTS DB (or main DB fallback)
// ============================================

export async function getAdminProducts(): Promise<ShopProduct[]> {
  const client = getNamedAdminClient('products');
  const { data, error } = await client
    .from('products').select('*').order('sort_order', { ascending: true });
  if (error) { console.error('Error fetching products:', error); return []; }
  return data.map(mapProductRowToShopProduct);
}

export async function getAdminProductById(id: string): Promise<ShopProduct | null> {
  const client = getNamedAdminClient('products');
  const { data, error } = await client.from('products').select('*').eq('id', id).single();
  if (error) { console.error('Error fetching product:', error); return null; }
  return mapProductRowToShopProduct(data);
}

export async function createProduct(product: {
  title: string; description?: string; image?: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  price?: string; original_price?: string; stripe_link?: string;
  ai_prompt?: string; sort_order?: number; active?: boolean;
}): Promise<{ success: boolean; data?: ShopProduct; error?: string }> {
  const client = getNamedAdminClient('products');
  const { data, error } = await client
    .from('products')
    .insert([{
      title: product.title, description: product.description || '',
      image: product.image || '', category: product.category,
      price: product.price || '', original_price: product.original_price || '',
      stripe_link: product.stripe_link || '', ai_prompt: product.ai_prompt || '',
      sort_order: product.sort_order ?? 0, active: product.active ?? true,
    }])
    .select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: mapProductRowToShopProduct(data) };
}

export async function updateProduct(
  id: string,
  updates: Partial<{
    title: string; description: string; image: string;
    category: 'Mindset' | 'Skillset' | 'Toolset';
    price: string; original_price: string; stripe_link: string;
    ai_prompt: string; sort_order: number; active: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const client = getNamedAdminClient('products');
  const { error } = await client.from('products').update(updates).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getNamedAdminClient('products');
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Subscribers API  →  uses SUBSCRIBERS DB (or main DB fallback)
// ============================================

export interface AdminSubscriber {
  id: string; email: string; name: string | null;
  source: string; subscribed_at: string;
  unsubscribed_at: string | null; active: boolean;
}

export async function getAdminSubscribers(): Promise<AdminSubscriber[]> {
  const client = getNamedAdminClient('subscribers');
  const { data, error } = await client
    .from('subscribers').select('*').order('subscribed_at', { ascending: false });
  if (error) { console.error('Error fetching subscribers:', error); return []; }
  return data;
}

export async function deleteSubscriber(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getNamedAdminClient('subscribers');
  const { error } = await client.from('subscribers').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================
// Analytics API  →  uses ANALYTICS DB (or main DB fallback)
// ============================================

export interface PostAnalytics {
  id: string; title: string; slug: string;
  category: string | null; views: number; created_at: string;
}

export async function getPostsAnalytics(): Promise<PostAnalytics[]> {
  const client = getNamedAdminClient('posts');
  const { data, error } = await client
    .from('posts')
    .select('id, title, slug, category, views, created_at')
    .order('views', { ascending: false });
  if (error) { console.error('Error fetching analytics:', error); return []; }
  return data || [];
}

export async function getSubscribersByMonth(): Promise<{ month: string; count: number }[]> {
  const client = getNamedAdminClient('subscribers');
  const { data, error } = await client
    .from('subscribers')
    .select('subscribed_at')
    .eq('active', true)
    .order('subscribed_at', { ascending: true });

  if (error || !data) return [];

  const monthly: Record<string, number> = {};
  for (const row of data) {
    const month = row.subscribed_at.slice(0, 7); // "YYYY-MM"
    monthly[month] = (monthly[month] || 0) + 1;
  }
  return Object.entries(monthly).map(([month, count]) => ({ month, count }));
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats() {
  const postsClient = getNamedAdminClient('posts');
  const productsClient = getNamedAdminClient('products');
  const subscribersClient = getNamedAdminClient('subscribers');

  const [postsResult, productsResult, subscribersResult, viewsResult] = await Promise.all([
    postsClient.from('posts').select('id', { count: 'exact', head: true }),
    productsClient.from('products').select('id', { count: 'exact', head: true }).eq('active', true),
    subscribersClient.from('subscribers').select('id', { count: 'exact', head: true }).eq('active', true),
    postsClient.from('posts').select('views'),
  ]);

  const totalViews = (viewsResult.data || []).reduce(
    (sum: number, row: { views: number }) => sum + (row.views || 0), 0
  );

  return {
    postsCount: postsResult.count || 0,
    productsCount: productsResult.count || 0,
    subscribersCount: subscribersResult.count || 0,
    viewsCount: totalViews,
  };
}
