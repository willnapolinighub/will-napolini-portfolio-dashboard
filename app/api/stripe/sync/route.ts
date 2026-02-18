/**
 * Stripe Product Sync Endpoint
 * Syncs a product to Stripe: creates/updates product, price, and payment link.
 * Called server-side so STRIPE_SECRET_KEY is never exposed to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncProductToStripe } from '@/lib/stripe';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      title,
      description,
      image,
      priceCents,
      originalPriceCents,
      currency,
      category,
      stripeProductId,
    } = body;

    if (!productId || !title || !priceCents || !currency) {
      return NextResponse.json(
        { success: false, error: 'productId, title, priceCents, and currency are required' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'STRIPE_SECRET_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    logger.info('Stripe sync request', { productId, title, priceCents, currency });

    const result = await syncProductToStripe({
      id: productId,
      title,
      description: description || '',
      image: image || '',
      priceCents: Number(priceCents),
      originalPriceCents: originalPriceCents ? Number(originalPriceCents) : undefined,
      currency: currency.toLowerCase(),
      category: category || '',
      stripeProductId: stripeProductId || undefined,
    });

    if (!result.success) {
      logger.warn('Stripe sync failed', { productId, error: result.error });
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    logger.info('Stripe sync success', {
      productId,
      stripeProductId: result.stripeProductId,
      stripeLink: result.stripeLink,
    });

    return NextResponse.json({
      success: true,
      stripeProductId: result.stripeProductId,
      stripePriceId: result.stripePriceId,
      stripePaymentLinkId: result.stripePaymentLinkId,
      stripeLink: result.stripeLink,
    });
  } catch (error) {
    logger.exception(
      error instanceof Error ? error : new Error(String(error)),
      'Stripe sync route error'
    );
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Stripe sync failed' },
      { status: 500 }
    );
  }
}
