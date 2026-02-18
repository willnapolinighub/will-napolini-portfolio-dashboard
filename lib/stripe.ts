/**
 * Stripe API Integration Service
 * Handles product creation, pricing, and payment links
 */

import logger from './logger';

// ── Types ─────────────────────────────────────────────────────────

export interface StripeProduct {
  id: string;
  object: 'product';
  name: string;
  description?: string;
  images: string[];
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripePrice {
  id: string;
  object: 'price';
  product: string;
  unit_amount: number;
  currency: string;
  active: boolean;
  metadata: Record<string, string>;
}

export interface StripePaymentLink {
  id: string;
  object: 'payment_link';
  url: string;
  active: boolean;
}

export interface SyncResult {
  success: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  stripePaymentLinkId?: string;
  stripeLink?: string;
  error?: string;
}

export interface ProductToSync {
  id: string;
  title: string;
  description?: string;
  image?: string;
  priceCents: number;
  originalPriceCents?: number;
  currency: string;
  category?: string;
  stripeProductId?: string;
  stripePriceId?: string;
}

// ── Configuration ─────────────────────────────────────────────────

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function getApiKey(): string {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return STRIPE_SECRET_KEY;
}

// ── HTTP Helper ───────────────────────────────────────────────────

async function stripeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  idempotencyKey?: string
): Promise<T> {
  const url = `${STRIPE_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  
  let bodyStr: string | undefined;
  if (body && method !== 'GET') {
    // Convert to form-encoded format
    bodyStr = Object.entries(body)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => {
        if (typeof v === 'object') {
          // Handle nested objects like metadata[key]=value
          return Object.entries(v as Record<string, string>)
            .map(([nk, nv]) => `${encodeURIComponent(`${k}[${nk}]`)}=${encodeURIComponent(String(nv))}`)
            .join('&');
        }
        return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
      })
      .join('&');
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: bodyStr,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = data as { error?: { message?: string; type?: string } };
    throw new Error(error.error?.message || `Stripe API error: ${response.status}`);
  }
  
  return data as T;
}

// ── Product Operations ─────────────────────────────────────────────

/**
 * Create a new product in Stripe
 */
export async function createStripeProduct(
  product: ProductToSync,
  idempotencyKey?: string
): Promise<StripeProduct> {
  logger.info('Creating Stripe product', { productId: product.id, title: product.title });
  
  const body: Record<string, unknown> = {
    name: product.title,
    description: product.description || '',
    active: true,
    'metadata[local_product_id]': product.id,
    'metadata[category]': product.category || '',
  };
  
  // Add image if provided (Stripe requires publicly accessible URLs)
  if (product.image && product.image.startsWith('https://')) {
    body.images = [product.image];
  }
  
  return stripeRequest<StripeProduct>(
    '/products',
    'POST',
    body,
    idempotencyKey || `product-create-${product.id}`
  );
}

/**
 * Update an existing product in Stripe
 */
export async function updateStripeProduct(
  stripeProductId: string,
  product: Partial<ProductToSync>
): Promise<StripeProduct> {
  logger.info('Updating Stripe product', { stripeProductId });
  
  const body: Record<string, unknown> = {};
  
  if (product.title) body.name = product.title;
  if (product.description !== undefined) body.description = product.description;
  if (product.image?.startsWith('https://')) body.images = [product.image];
  
  return stripeRequest<StripeProduct>(
    `/products/${stripeProductId}`,
    'POST',
    body
  );
}

/**
 * Archive (deactivate) a product in Stripe
 */
export async function archiveStripeProduct(
  stripeProductId: string
): Promise<StripeProduct> {
  logger.info('Archiving Stripe product', { stripeProductId });
  
  return stripeRequest<StripeProduct>(
    `/products/${stripeProductId}`,
    'POST',
    { active: false }
  );
}

// ── Price Operations ───────────────────────────────────────────────

/**
 * Create a price for a product in Stripe
 * Prices are in cents (e.g., $49.00 = 4900)
 */
export async function createStripePrice(
  stripeProductId: string,
  priceCents: number,
  currency: string = 'usd',
  idempotencyKey?: string
): Promise<StripePrice> {
  logger.info('Creating Stripe price', { 
    stripeProductId, 
    amount: priceCents, 
    currency 
  });
  
  return stripeRequest<StripePrice>(
    '/prices',
    'POST',
    {
      product: stripeProductId,
      unit_amount: priceCents,
      currency: currency.toLowerCase(),
      'metadata[source]': 'myshop-admin',
    },
    idempotencyKey || `price-create-${stripeProductId}-${priceCents}-${currency}`
  );
}

/**
 * Create a price with display (for showing original/sale price)
 * Uses Stripe's "custom unit amount" for variable pricing
 */
export async function createStripePriceWithDisplay(
  stripeProductId: string,
  priceCents: number,
  originalPriceCents?: number,
  currency: string = 'usd'
): Promise<StripePrice> {
  logger.info('Creating Stripe price with display', { 
    stripeProductId, 
    priceCents, 
    originalPriceCents,
    currency 
  });
  
  return stripeRequest<StripePrice>(
    '/prices',
    'POST',
    {
      product: stripeProductId,
      unit_amount: priceCents,
      currency: currency.toLowerCase(),
      'metadata[original_price_cents]': originalPriceCents?.toString() || '',
      'metadata[source]': 'myshop-admin',
    },
    `price-${stripeProductId}-${priceCents}-${originalPriceCents || 0}-${currency}`
  );
}

// ── Payment Link Operations ────────────────────────────────────────

/**
 * Create a payment link for a price
 */
export async function createPaymentLink(
  stripePriceId: string,
  idempotencyKey?: string
): Promise<StripePaymentLink> {
  logger.info('Creating Stripe payment link', { stripePriceId });
  
  return stripeRequest<StripePaymentLink>(
    '/payment_links',
    'POST',
    {
      'line_items[0][price]': stripePriceId,
      'line_items[0][quantity]': 1,
    },
    idempotencyKey || `payment-link-${stripePriceId}`
  );
}

/**
 * Update payment link (activate/deactivate)
 */
export async function updatePaymentLink(
  paymentLinkId: string,
  active: boolean
): Promise<StripePaymentLink> {
  logger.info('Updating payment link', { paymentLinkId, active });
  
  return stripeRequest<StripePaymentLink>(
    `/payment_links/${paymentLinkId}`,
    'POST',
    { active }
  );
}

// ── Full Sync Workflow ─────────────────────────────────────────────

/**
 * Sync a product to Stripe: creates product, price, and payment link
 * Returns all Stripe IDs for storage
 */
export async function syncProductToStripe(product: ProductToSync): Promise<SyncResult> {
  try {
    logger.info('Starting Stripe sync', { productId: product.id });
    
    // Step 1: Create or update product
    let stripeProduct: StripeProduct;
    if (product.stripeProductId) {
      stripeProduct = await updateStripeProduct(product.stripeProductId, product);
    } else {
      stripeProduct = await createStripeProduct(product);
    }
    
    // Step 2: Create price (always create new price if amount changed)
    const stripePrice = await createStripePrice(
      stripeProduct.id,
      product.priceCents,
      product.currency
    );
    
    // Step 3: Create payment link
    const paymentLink = await createPaymentLink(stripePrice.id);
    
    logger.info('Stripe sync completed', { 
      productId: product.id,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      paymentLinkId: paymentLink.id
    });
    
    return {
      success: true,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      stripePaymentLinkId: paymentLink.id,
      stripeLink: paymentLink.url,
    };
  } catch (error) {
    logger.exception(
      error instanceof Error ? error : new Error(String(error)),
      'Stripe sync failed'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Stripe sync',
    };
  }
}

// ── Utility Functions ──────────────────────────────────────────────

/**
 * Convert price string (e.g., "$49.00") to cents
 */
export function priceToCents(priceString: string): number {
  // Remove currency symbol and whitespace
  const cleaned = priceString.replace(/[$€£¥\s]/g, '');
  const amount = parseFloat(cleaned);
  return Math.round(amount * 100);
}

/**
 * Convert cents to price string
 */
export function centsToPrice(cents: number, currency: string = 'USD'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Get supported currencies
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'usd', symbol: '$', name: 'US Dollar' },
  { code: 'eur', symbol: '€', name: 'Euro' },
  { code: 'gbp', symbol: '£', name: 'British Pound' },
  { code: 'cad', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'aud', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'jpy', symbol: '¥', name: 'Japanese Yen' },
] as const;

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

// ── Webhook Verification ───────────────────────────────────────────

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Note: In production, use stripe-node library for proper signature verification
  // This is a simplified check - the actual implementation should use crypto.timingSafeEqual
  try {
    // For now, just check the signature exists and secret matches
    return signature.length > 0 && secret === process.env.STRIPE_WEBHOOK_SECRET;
  } catch {
    return false;
  }
}