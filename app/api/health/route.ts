import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check 1: Application is running
  checks.push({
    name: 'application',
    status: 'healthy',
  });

  // Check 2: Supabase connection
  if (isSupabaseConfigured) {
    try {
      const dbStart = Date.now();
      const client = getSupabaseClient();
      
      // Simple query to test connection
      const { error } = await client
        .from('settings')
        .select('key')
        .limit(1);
      
      const dbLatency = Date.now() - dbStart;
      
      if (error) {
        checks.push({
          name: 'database',
          status: 'unhealthy',
          error: error.message,
        });
      } else {
        checks.push({
          name: 'database',
          status: dbLatency > 1000 ? 'degraded' : 'healthy',
          latency: dbLatency,
        });
      }
    } catch (err) {
      checks.push({
        name: 'database',
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  } else {
    checks.push({
      name: 'database',
      status: 'degraded',
      error: 'Supabase not configured',
    });
  }

  // Check 3: Environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    (key) => !process.env[key]
  );
  
  checks.push({
    name: 'environment',
    status: missingEnvVars.length === 0 ? 'healthy' : 'degraded',
    error: missingEnvVars.length > 0 
      ? `Missing: ${missingEnvVars.join(', ')}`
      : undefined,
  });

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
  const hasDegraded = checks.some((c) => c.status === 'degraded');
  
  const overallStatus = hasUnhealthy 
    ? 'unhealthy' 
    : hasDegraded 
      ? 'degraded' 
      : 'healthy';

  const totalLatency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      latency: totalLatency,
      checks,
    },
    { 
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}