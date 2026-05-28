import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function sendMagicLink(formData: FormData) {
  'use server';
  const rawEmail = formData.get('email');
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/login?error=invalid_email');
  }

  const supabase = createServerSupabaseClient();
  const headerStore = headers();
  const host = headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto') ?? 'http';
  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (host ? `${proto}://${host}` : undefined);

  const redirectTo = siteBase ? `${siteBase}/auth/callback` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  if (error) {
    redirect('/login?error=send_failed');
  }

  redirect('/login?sent=1');
}
