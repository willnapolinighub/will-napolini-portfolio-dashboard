/**
 * Stripe API Test Endpoint
 * Tests Stripe API key validity by retrieving account info
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secretKey } = body;
    
    if (!secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Secret key is required',
      });
    }
    
    // Validate key format
    const isTestKey = secretKey.startsWith('sk_test_');
    const isLiveKey = secretKey.startsWith('sk_live_');
    
    if (!isTestKey && !isLiveKey) {
      return NextResponse.json({
        success: false,
        error: 'Invalid key format. Must start with sk_test_ or sk_live_',
      });
    }
    
    // Test by calling Stripe's balance endpoint
    const response = await fetch('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      logger.warn('Stripe test failed', { status: response.status, error });
      return NextResponse.json({
        success: false,
        error: error.error?.message || `Stripe API error: ${response.status}`,
      });
    }
    
    const balance = await response.json();
    
    logger.info('Stripe test successful', { 
      livemode: balance.livemode,
      available: balance.available?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      accountId: balance.object || 'connected',
      livemode: balance.livemode || false,
      available: balance.available?.map((b: { currency: string; amount: number }) => ({
        currency: b.currency,
        amount: b.amount,
      })) || [],
    });
    
  } catch (error) {
    logger.exception(error instanceof Error ? error : new Error(String(error)), 'Stripe test error');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
    });
  }
}