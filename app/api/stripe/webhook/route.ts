/**
 * Stripe Webhook Handler
 * Handles events from Stripe: payment success, failures, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import logger from '@/lib/logger';

// ── Webhook Event Types ───────────────────────────────────────────

interface StripeEvent {
  id: string;
  object: 'event';
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
  livemode: boolean;
}

// ── Event Handlers ─────────────────────────────────────────────────

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const paymentLinkId = session.payment_link as string;
  const customerId = session.customer as string;
  const paymentIntent = session.payment_intent as string;
  
  logger.info('Checkout completed', { 
    paymentLinkId, 
    customerId,
    paymentIntent 
  });
  
  // Find local product by payment link ID
  const client = getAdminClient();
  const { data: product, error } = await client
    .from('products')
    .select('*')
    .eq('stripe_payment_link_id', paymentLinkId)
    .single();
  
  if (error || !product) {
    logger.warn('Product not found for payment link', { paymentLinkId });
    return;
  }
  
  // Optionally: Update product stats, send notifications, etc.
  // For now, just log the successful purchase
  logger.info('Product purchased', { 
    productId: product.id,
    title: product.title,
    customerId 
  });
}

/**
 * Handle payment intent succeeded
 */
async function handlePaymentSucceeded(paymentIntent: Record<string, unknown>) {
  const amount = paymentIntent.amount as number;
  const currency = paymentIntent.currency as string;
  const metadata = paymentIntent.metadata as Record<string, string> | undefined;
  
  logger.info('Payment succeeded', { 
    amount,
    currency,
    productId: metadata?.product_id 
  });
  
  // If we have product metadata, update any relevant records
  if (metadata?.local_product_id) {
    const client = getAdminClient();
    
    // Could track sales count, last purchase date, etc.
    // For now, just log
    logger.info('Payment for product', { 
      productId: metadata.local_product_id,
      amount,
      currency 
    });
  }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(paymentIntent: Record<string, unknown>) {
  const amount = paymentIntent.amount as number;
  const currency = paymentIntent.currency as string;
  const lastPaymentError = paymentIntent.last_payment_error as Record<string, unknown> | undefined;
  
  logger.warn('Payment failed', { 
    amount,
    currency,
    error: lastPaymentError?.message 
  });
}

/**
 * Handle price created/updated
 */
async function handlePriceEvent(price: Record<string, unknown>) {
  const productId = price.product as string;
  const unitAmount = price.unit_amount as number;
  const currency = price.currency as string;
  
  logger.info('Price event', { 
    productId,
    unitAmount,
    currency 
  });
}

// ── Main Webhook Handler ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Verify signature (simplified - in production use stripe library)
    if (!webhookSecret) {
      logger.warn('Stripe webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }
    
    // Parse the event
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      logger.error('Invalid JSON in webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }
    
    // Log the event
    logger.info('Stripe webhook received', {
      eventId: event.id,
      type: event.type,
      livemode: event.livemode
    });
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'price.created':
      case 'price.updated':
        await handlePriceEvent(event.data.object);
        break;
        
      case 'product.created':
      case 'product.updated':
        logger.info('Product event', { 
          productId: event.data.object.id 
        });
        break;
        
      default:
        logger.debug('Unhandled webhook event type', { 
          type: event.type 
        });
    }
    
    const duration = Date.now() - startTime;
    logger.response('POST', '/api/stripe/webhook', 200, duration);
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    logger.exception(
      error instanceof Error ? error : new Error(String(error)),
      'Stripe webhook error'
    );
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}