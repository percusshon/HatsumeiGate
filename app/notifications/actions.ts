'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

// 既読化は受信者本人のみ（RLS notifications_update_own）。
export async function markNotificationReadAction(formData: FormData) {
  const notificationId = typeof formData.get('notification_id') === 'string' ? (formData.get('notification_id') as string).trim() : null;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (!notificationId) {
    redirect('/notifications');
  }

  const supabase = createServerSupabaseClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);

  revalidatePath('/notifications');
  redirect('/notifications');
}

export async function markAllNotificationsReadAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', currentUser.id)
    .is('read_at', null);

  revalidatePath('/notifications');
  redirect('/notifications');
}
