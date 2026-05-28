import type { ReactNode } from 'react';
import '@/app/globals.css';
import { SiteNav } from '@/components/site-nav';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-6">
          <header className="space-y-2 border-b border-slate-200 pb-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Hatsumei Gate / 発明ゲート</p>
            <h1 className="text-2xl font-bold">Hatsumei Gate Scaffold</h1>
            <SiteNav />
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 pt-4 text-sm text-slate-500">
            <p>
              This is a minimal scaffold. 詳細機能は次フェーズで追加します。
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
