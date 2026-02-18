// ============================================
// Tenant / API Key validation
// Supports multiple client apps connecting to this admin service
// ============================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  webhook_url?: string;
  features: {
    blog: boolean;
    shop: boolean;
    subscribers: boolean;
    ai_assistant: boolean;
  };
  branding: {
    site_name: string;
    logo_url?: string;
    primary_color?: string;
  };
  is_active: boolean;
}

// Default tenant (the owner of this admin instance)
export const DEFAULT_TENANT: Tenant = {
  id: 'default',
  name: 'Will Napolini',
  slug: 'will-napolini',
  api_key: process.env.ADMIN_API_KEY || '',
  webhook_url: process.env.ADMIN_WEBHOOK_URL,
  features: {
    blog: true,
    shop: true,
    subscribers: true,
    ai_assistant: true,
  },
  branding: {
    site_name: 'Will Napolini',
    primary_color: '#28F29C',
  },
  is_active: true,
};

/**
 * Validate an API key from an incoming request header.
 * Supports: "Bearer sk_xxx" or plain "sk_xxx" or "X-Api-Key: sk_xxx"
 *
 * TODO: In a full multi-tenant setup, replace the env-var check with a
 * DB lookup against a `tenants` table so each client app gets its own key.
 */
export function validateApiKey(authHeader: string | null): { valid: boolean; tenant?: Tenant } {
  if (!authHeader) return { valid: false };

  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    console.warn('[API] ADMIN_API_KEY is not set — all public API requests will be rejected');
    return { valid: false };
  }

  if (apiKey === configuredKey) {
    return { valid: true, tenant: DEFAULT_TENANT };
  }

  return { valid: false };
}

/**
 * Send a webhook notification to a tenant's registered webhook URL.
 */
export async function notifyTenant(
  tenant: Tenant,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!tenant.webhook_url) return;

  try {
    await fetch(tenant.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Event': event,
        'X-Admin-Tenant': tenant.id,
      },
      body: JSON.stringify({ event, tenant: tenant.id, data, timestamp: new Date().toISOString() }),
    });
  } catch (error) {
    console.error(`[Webhook] Failed for tenant ${tenant.name}:`, error);
  }
}
