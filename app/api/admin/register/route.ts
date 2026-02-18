import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * Dev-only admin registration endpoint.
 * Auto-disabled in production — returns 403 if NODE_ENV === 'production'.
 *
 * POST /api/admin/register
 * Body: { email: string, password: string }
 */
export async function POST(request: Request) {
  // Hard-block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Registration is disabled in production. Create users via the Supabase dashboard.' },
      { status: 403 }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // Use the service-role admin client to create the user.
    // This bypasses email confirmation and DNS validation.
    const admin = getAdminClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip the confirmation email
    });

    if (authError) {
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User created but no ID was returned.' },
        { status: 500 }
      );
    }

    // Insert into admin_users so middleware grants access
    const { error: insertError } = await admin
      .from('admin_users')
      .upsert({ id: userId, email, role: 'admin' }, { onConflict: 'id' });

    if (insertError) {
      // If admin_users table doesn't exist yet, still allow login
      console.warn('[Register] Could not insert into admin_users:', insertError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. You can now sign in.',
      userId,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
