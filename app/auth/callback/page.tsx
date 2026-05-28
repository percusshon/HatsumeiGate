import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type SearchParams = {
  code?: string | string[];
};

export default async function AuthCallbackPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const code = Array.isArray(searchParams?.code) ? searchParams.code[0] : searchParams?.code;

  if (!code) {
    redirect('/login?error=callback');
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect('/login?error=callback');
  }

  redirect('/inventor');
}
