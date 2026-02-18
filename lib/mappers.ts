// ============================================
// Single source of truth for DB row → domain type mapping
// Import from here in both admin-api.ts and API routes
// ============================================

import { BlogPost, ShopProduct } from './types';
import { PostRow, ProductRow } from './supabase';

export function mapPostRowToBlogPost(row: PostRow): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    image: row.image || '',
    category: row.category || 'Mindset',
    date: new Date(row.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    readTime: row.read_time,
    views: row.views ?? 0,
    content: row.content || '',
    aiPrompt: row.ai_prompt || '',
  };
}

export function mapProductRowToShopProduct(row: ProductRow): ShopProduct {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    image: row.image || '',
    category: row.category || 'Mindset',
    price: row.price || '',
    originalPrice: row.original_price || '',
    stripeLink: row.stripe_link || '',
    aiPrompt: row.ai_prompt || '',
  };
}
