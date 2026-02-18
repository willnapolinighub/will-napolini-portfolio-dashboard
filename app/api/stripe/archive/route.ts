/**
 * Stripe Product Archive Endpoint
 * Archives a Stripe product (sets active: false) and deactivates its payment link.
 * Called before deleting a product from the database so the Stripe product is
 * no longer purchasable by customers.
 *
 * Strategy: fetches the product's stripe_link from Supabase, then looks up the
 * matching payment link in Stripe to obtain the plink_ ID, price ID, and product ID.
 *
 * Note: Stripe does not allow deleting products that have been used in charges.
 * Archiving is the recommended approach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import logger from '@/lib/logger';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function stripeHeaders() {
  return {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_API_BASE}${path}`, { headers: stripeHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `Stripe ${res.status}`);
  return data as T;
}

async function stripePost<T>(path: string, body: string): Promise<T> {
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: stripeHeaders(),
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `Stripe ${res.status}`);
  return data as T;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ success: true, skipped: true, reason: 'Stripe not configured' });
    }

    // Fetch the product to get the stripe_link URL
    const client = getAdminClient();
    const { data: product, error } = await client
      .from('products')
      .select('id, title, stripe_link')
      .eq('id', productId)
      .single();

    if (error || !product) {
      logger.warn('Product not found for Stripe archive', { productId });
      return NextResponse.json({ success: true, skipped: true, reason: 'Product not found in DB' });
    }

    const { stripe_link } = product;

    if (!stripe_link) {
      return NextResponse.json({ success: true, skipped: true, reason: 'No Stripe payment link stored' });
    }

    logger.info('Archiving Stripe resources for product', { productId, stripe_link });

    const errors: string[] = [];
    let archivedProductId: string | null = null;

    // Find the payment link by URL
    const paymentLinks = await stripeGet<{ data: Array<{ id: string; url: string; active: boolean; line_items?: { data: Array<{ price: { id: string; product: string } }> } }> }>(
      '/payment_links?limit=100&expand[]=data.line_items'
    );

    const match = paymentLinks.data.find(
      (pl) => pl.url === stripe_link || stripe_link.includes(pl.id)
    );

    if (match) {
      // Step 1: Deactivate payment link
      if (match.active) {
        try {
          await stripePost(`/payment_links/${match.id}`, 'active=false');
          logger.info('Payment link deactivated', { paymentLinkId: match.id });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Payment link deactivate: ${msg}`);
          logger.warn('Failed to deactivate payment link', { paymentLinkId: match.id, error: msg });
        }
      }

      // Step 2: Get the product ID from the payment link's line items
      const stripeProductId = match.line_items?.data?.[0]?.price?.product;
      if (stripeProductId) {
        archivedProductId = stripeProductId;
        try {
          await stripePost(`/products/${stripeProductId}`, 'active=false');
          logger.info('Stripe product archived', { stripeProductId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Product archive: ${msg}`);
          logger.warn('Failed to archive Stripe product', { stripeProductId, error: msg });
        }
      }
    } else {
      logger.warn('No matching Stripe payment link found', { stripe_link });
      errors.push('No matching payment link found in Stripe');
    }

    return NextResponse.json({
      success: true,
      archived: !!archivedProductId,
      archivedProductId,
      warnings: errors.length ? errors : undefined,
    });
  } catch (error) {
    logger.exception(
      error instanceof Error ? error : new Error(String(error)),
      'Stripe archive route error'
    );
    // Return success so the DB delete still proceeds — Stripe archive is best-effort
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: error instanceof Error ? error.message : 'Archive failed',
    });
  }
}
