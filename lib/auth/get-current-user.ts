import { createServerSupabaseClient } from '@/lib/supabase/server';

export type SimpleUserProfile = {
  id: string;
  role: string | null;
  display_name: string | null;
  email: string | null;
};

export async function getCurrentUser(): Promise<SimpleUserProfile | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('users_profile')
    .select('id, display_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    role: null,
    display_name: profile.display_name,
    email: profile.email
  };
}
