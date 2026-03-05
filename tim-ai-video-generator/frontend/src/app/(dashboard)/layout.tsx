'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import clsx from 'clsx';
import { useAuth } from '@/context/auth-context';

type NavItem = {
  label: string;
  href: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', description: 'Stats & quick launch' },
  { label: 'Sign → Text', href: '/dashboard/translator/sign-to-text', description: 'Webcam capture' },
  { label: 'Speech → Sign', href: '/dashboard/translator/speech-to-sign', description: 'Avatar playback' },
  { label: 'Dictionary', href: '/dashboard/dictionary', description: 'Sign references' },
  { label: 'History', href: '/dashboard/history', description: 'Track sessions' },
  { label: 'Settings', href: '/dashboard/settings', description: 'Preferences' },
  { label: 'Profile', href: '/dashboard/profile', description: 'Account details' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = Boolean(accessToken);

  const activeSection = useMemo(() => {
    return NAV_ITEMS.find((item) => pathname?.startsWith(item.href)) ?? NAV_ITEMS[0];
  }, [pathname]);

  if (!isAuthenticated) {
    router.replace('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-secondary text-slate-900 dark:text-white flex">
      <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-col border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-dark-primary/80 backdrop-blur">
        <div className="px-6 py-6">
          <Link href="/dashboard" className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-primary-500">TIM-AI</span>
            <span className="text-xl font-bold">Translation Console</span>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{user?.email}</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'block rounded-2xl px-4 py-3 transition-colors',
                      isActive
                        ? 'bg-primary-500/10 border border-primary-200 text-primary-600 dark:border-primary-500/40'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60',
                    )}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="px-6 py-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              logout();
              router.push('/signin');
            }}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-secondary/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Current view</p>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{activeSection.label}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => router.push('/dashboard/translator/sign-to-text')}
                className="hidden sm:inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Launch Sign → Text
              </button>
              <button
                onClick={() => router.push('/dashboard/translator/speech-to-sign')}
                className="inline-flex items-center rounded-full bg-primary-500 text-white px-4 py-2 font-medium hover:bg-primary-600"
              >
                Start Session
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 py-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
