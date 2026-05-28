import { createServerSupabaseClient } from '@/lib/supabase/server';

export type SimpleUserProfile = {
  id: string;
  role: string | null;
  roles: string[];
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

  const { data: rolesRows, error: rolesError } = await supabase
    .from('user_app_roles')
    .select('role')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const roles = rolesError ? [] : (rolesRows ?? []).map((row) => row.role);

  return {
    id: profile.id,
    role: roles[0] ?? null,
    roles,
    display_name: profile.display_name,
    email: profile.email
  };
}
