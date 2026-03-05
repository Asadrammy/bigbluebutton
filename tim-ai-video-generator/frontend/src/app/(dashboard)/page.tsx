'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { fetchHistory, fetchHistoryStats } from '@/lib/api/history';
import type { HistoryStatsResponse, TranslationHistoryEntry } from '@/lib/api/types';

const cards = [
  {
    title: 'Sign Language → Text',
    description: 'Capture sign language via webcam and convert it to spoken language text.',
    action: '/dashboard/translator/sign-to-text',
  },
  {
    title: 'Speech → Sign Language',
    description: 'Record speech and render a 3D avatar performing the translated sign language.',
    action: '/dashboard/translator/speech-to-sign',
  },
  {
    title: 'Translation History',
    description: 'Review and manage past translations across all modalities.',
    action: '/dashboard/history',
  },
];

const PLACEHOLDER_STATS: HistoryStatsResponse = {
  total_translations: 0,
  total_by_type: {},
  total_by_language: {},
  avg_confidence: null,
  avg_processing_time: null,
};

export default function DashboardHome() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<HistoryStatsResponse>(PLACEHOLDER_STATS);
  const [recent, setRecent] = useState<TranslationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setStats(PLACEHOLDER_STATS);
      setRecent([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchHistory(accessToken, { per_page: 5 }),
      fetchHistoryStats(accessToken),
    ])
      .then(([historyResponse, statsResponse]) => {
        if (cancelled) return;
        setRecent(historyResponse.items);
        setStats(statsResponse);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        toast.error((error as { message?: string })?.message || 'Failed to load dashboard data');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const topTypes = useMemo(() => Object.entries(stats.total_by_type || {}), [stats.total_by_type]);
  const topLanguages = useMemo(
    () => Object.entries(stats.total_by_language || {}).slice(0, 4),
    [stats.total_by_language],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-gray-500">Phase 1 Preview</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
          We’re gradually wiring the web experience to the backend. These quick stats update as soon as you
          run translations so you can keep an eye on recent usage.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total translations"
          value={stats.total_translations}
          isLoading={isLoading}
        />
        <StatCard
          label="Average confidence"
          value={stats.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '—'}
          isLoading={isLoading}
        />
        <StatCard
          label="Average processing"
          value={stats.avg_processing_time ? `${stats.avg_processing_time.toFixed(2)}s` : '—'}
          isLoading={isLoading}
        />
        <StatCard label="Tracked languages" value={topLanguages.length} isLoading={isLoading} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Navigator</p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick actions</h2>
            </div>
            <span className="text-xs text-gray-400">Always available</span>
          </div>
          <div className="grid gap-4">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{card.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
                <Link
                  href={card.action}
                  className="inline-flex items-center gap-2 text-primary-500 font-medium text-sm mt-3"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Latest</p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent translations</h2>
            </div>
            <Link href="/dashboard/history" className="text-sm text-primary-500 font-medium">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading && recent.length === 0 ? (
              <div className="text-sm text-gray-500">Loading recent activity…</div>
            ) : recent.length === 0 ? (
              <div className="text-sm text-gray-500">No translations yet. Try running one!</div>
            ) : (
              recent.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-gray-400">{entry.translation_type}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                    {entry.source_text}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {entry.target_text}
                  </p>
                  <div className="text-xs text-gray-400">
                    {entry.source_language} → {entry.target_language}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Breakdown</p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usage snapshot</h2>
          </div>
          <span className="text-xs text-gray-400">Last {recent.length} translations</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By translation type</p>
            <ul className="space-y-2">
              {topTypes.length === 0 && <li className="text-sm text-gray-500">No data yet.</li>}
              {topTypes.map(([type, total]) => (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600 dark:text-gray-300">{type}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top source languages</p>
            <ul className="space-y-2">
              {topLanguages.length === 0 && <li className="text-sm text-gray-500">No data yet.</li>}
              {topLanguages.map(([lang, total]) => (
                <li key={lang} className="flex items-center justify-between text-sm">
                  <span className="uppercase text-gray-600 dark:text-gray-300">{lang}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number | string;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
        {isLoading ? '…' : value}
      </p>
    </div>
  );
}
