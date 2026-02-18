// ============================================
// Shared Domain Types
// Used by both admin dashboard and API responses
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  date: string;
  readTime: string;
  views: number;
  content: string;
  aiPrompt: string;
}

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  price: string;
  originalPrice: string;
  stripeLink: string;
  aiPrompt: string;
}

export type Category = 'All' | 'Mindset' | 'Skillset' | 'Toolset';
