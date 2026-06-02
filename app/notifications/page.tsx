import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { markAllNotificationsReadAction, markNotificationReadAction } from './actions';

export const dynamic = 'force-dynamic';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string | null;
};

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">通知（ログイン待ち）</h2>
        <p className="text-slate-700">通知の閲覧にはログインが必要です。</p>
        <Link href="/login" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Loginへ
        </Link>
      </div>
    );
  }

  const supabase = createServerSupabaseClient();
  // RLS（notifications_select_own）により本人宛の通知のみ返る。
  const { data: rows } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_path, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const notifications = (rows ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">通知</h2>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-sm text-blue-700 hover:underline">
              すべて既読にする（{unreadCount}）
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">通知はありません。</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`space-y-1 rounded-md border p-4 text-sm ${
                notification.read_at ? 'border-slate-200 bg-white text-slate-600' : 'border-blue-200 bg-blue-50 text-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{notification.title}</p>
                {!notification.read_at ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">未読</span>
                ) : null}
              </div>
              {notification.body ? <p className="text-sm">{notification.body}</p> : null}
              <p className="text-xs text-slate-500">
                {notification.created_at ? new Date(notification.created_at).toLocaleString('ja-JP') : ''}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {notification.link_path ? (
                  <Link href={notification.link_path} className="text-xs font-semibold text-blue-700 hover:underline">
                    開く
                  </Link>
                ) : null}
                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={notification.id} />
                    <button type="submit" className="text-xs font-semibold text-slate-600 hover:underline">
                      既読にする
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
