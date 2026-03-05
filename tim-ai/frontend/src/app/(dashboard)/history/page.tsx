'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { fetchHistory, deleteHistoryItem, clearHistory, fetchHistoryStats } from '@/lib/api/history';
import type { HistoryStatsResponse, TranslationHistoryEntry } from '@/lib/api/types';

const TRANSLATION_TYPES: Array<{ label: string; value: 'text' | 'speech' | 'sign' | '' }> = [
  { label: 'All types', value: '' },
  { label: 'Text ↔ Text', value: 'text' },
  { label: 'Speech ↔ Sign', value: 'speech' },
  { label: 'Sign ↔ Speech', value: 'sign' },
];

export default function HistoryPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<TranslationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<{ translation_type: '' | 'text' | 'speech' | 'sign'; language: string }>(
    { translation_type: '', language: '' },
  );
  const [selectedEntry, setSelectedEntry] = useState<TranslationHistoryEntry | null>(null);
  const [stats, setStats] = useState<HistoryStatsResponse | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const canLoad = useMemo(() => Boolean(accessToken), [accessToken]);

  function exportHistory(format: 'json' | 'csv') {
    if (items.length === 0) {
      toast.error('Nothing to export');
      return;
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'translation-history.json';
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const header = ['id', 'type', 'source_language', 'target_language', 'source_text', 'target_text', 'confidence', 'processing_time', 'created_at'];
    const rows = items.map((item) => [
      item.id,
      item.translation_type,
      item.source_language,
      item.target_language,
      JSON.stringify(item.source_text ?? ''),
      JSON.stringify(item.target_text ?? ''),
      item.confidence ?? '',
      item.processing_time ?? '',
      item.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const asString = String(value ?? '');
            if (asString.includes(',') || asString.includes('\n')) {
              return `"${asString.replace(/"/g, '""')}"`;
            }
            return asString;
          })
          .join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'translation-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!canLoad) {
      setItems([]);
      setStats(null);
      return;
    }

    async function loadHistory() {
      setIsLoading(true);
      try {
        const response = await fetchHistory(accessToken!, {
          page,
          per_page: perPage,
          translation_type: filters.translation_type || undefined,
          language: filters.language || undefined,
        });
        setItems(response.items);
        setTotalPages(response.pages || 1);
      } catch (error) {
        console.error(error);
        toast.error((error as { message?: string })?.message || 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [accessToken, canLoad, page, perPage, filters.translation_type, filters.language]);

  useEffect(() => {
    if (!canLoad) return;

    async function loadStats() {
      setIsStatsLoading(true);
      try {
        const response = await fetchHistoryStats(accessToken!);
        setStats(response);
      } catch (error) {
        console.error(error);
      } finally {
        setIsStatsLoading(false);
      }
    }

    loadStats();
  }, [accessToken, canLoad]);

  async function handleDelete(id: number) {
    if (!accessToken) return;
    try {
      await deleteHistoryItem(accessToken, id);
      toast.success('Entry deleted');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      toast.error((error as { message?: string })?.message || 'Failed to delete entry');
    }
  }

  async function handleClear() {
    if (!accessToken) return;
    if (!confirm('Clear all translation history?')) return;
    try {
      await clearHistory(accessToken);
      toast.success('History cleared');
      setItems([]);
      setPage(1);
    } catch (error) {
      console.error(error);
      toast.error((error as { message?: string })?.message || 'Failed to clear history');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Activity</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Translation history</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
            Review past translations across modalities. Filter by type or language and remove entries as needed.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['text', 'speech', 'sign'].map((type) => {
            const totalByType = stats?.total_by_type?.[type] ?? 0;
            const label = type === 'text' ? 'Text Text' : type === 'speech' ? 'Speech Sign' : 'Sign Speech';
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, translation_type: prev.translation_type === (type as 'text' | 'speech' | 'sign') ? '' : (type as 'text' | 'speech' | 'sign') }));
                  setPage(1);
                }}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  filters.translation_type === type
                    ? 'border-primary-300 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {isStatsLoading ? '…' : totalByType.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Tap to {filters.translation_type === type ? 'clear filter' : 'filter'}</p>
              </button>
            );
          })}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total translations</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isStatsLoading ? '…' : (stats?.total_translations ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Since account creation</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm"
            value={filters.translation_type}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, translation_type: event.target.value as 'text' | 'speech' | 'sign' | '' }));
              setPage(1);
            }}
          >
            {TRANSLATION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by language code (de, en, DGS…)"
            className="rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm"
            value={filters.language}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, language: event.target.value }));
              setPage(1);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setFilters({ translation_type: '', language: '' });
              setPage(1);
            }}
            className="text-sm font-medium text-primary-500"
          >
            Reset filters
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium"
          >
            Clear history
          </button>
          <button
            type="button"
            onClick={() => exportHistory('json')}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => exportHistory('csv')}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </header>
    </div>
  );
}
