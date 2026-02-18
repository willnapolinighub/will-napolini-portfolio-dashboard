/**
 * Stripe Status Endpoint
 * Returns whether Stripe is configured (server-side check)
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const isConfigured = !!process.env.STRIPE_SECRET_KEY;
  
  return NextResponse.json({
    configured: isConfigured,
    mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
  });
}