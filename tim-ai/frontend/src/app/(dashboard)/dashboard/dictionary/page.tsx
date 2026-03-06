'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AvatarViewer } from '@/components/avatar-viewer';
import { fetchAvailableSigns, fetchSignInfo } from '@/lib/api/translation';
import type { AnimationData, SignInfoResponse } from '@/lib/api/types';

export default function DictionaryPage() {
  const [signs, setSigns] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectedSign, setSelectedSign] = useState<string>('');
  const [signInfo, setSignInfo] = useState<SignInfoResponse['data'] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingSign, setIsLoadingSign] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<'all' | string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadSigns = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await fetchAvailableSigns();
      const nextSigns = response.data.signs || [];
      setSigns(nextSigns);
      setSelectedSign((prev) => {
        if (prev && nextSigns.includes(prev)) {
          return prev;
        }
        return nextSigns[0] ?? '';
      });
      setListError(null);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error(error);
      const message = (error as { message?: string })?.message || 'Failed to load signs';
      setListError(message);
      toast.error(message);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadSigns();
  }, [loadSigns]);

  useEffect(() => {
    if (!selectedSign) {
      setSignInfo(null);
      return;
    }

    async function loadSignInfo() {
      setIsLoadingSign(true);
      try {
        const response = await fetchSignInfo(selectedSign);
        setSignInfo(response.data);
      } catch (error) {
        console.error(error);
        toast.error((error as { message?: string })?.message || 'Failed to load sign info');
      } finally {
        setIsLoadingSign(false);
      }
    }

    loadSignInfo();
  }, [selectedSign]);

  const letterOptions = useMemo(() => {
    const initials = Array.from(new Set(signs.map((sign) => sign.charAt(0).toUpperCase())));
    return initials.sort((a, b) => a.localeCompare(b));
  }, [signs]);

  const filteredSigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const byLetter = selectedLetter === 'all'
      ? signs
      : signs.filter((sign) => sign.charAt(0).toLowerCase() === selectedLetter.toLowerCase());

    if (!normalizedQuery) {
      return byLetter;
    }
    return byLetter.filter((sign) => sign.toLowerCase().includes(normalizedQuery));
  }, [query, selectedLetter, signs]);

  const animationData: AnimationData | null = useMemo(() => {
    if (!signInfo) return null;
    return {
      duration: signInfo.duration,
      format: 'json',
      keyframes: signInfo.keyframes.reduce((acc, keyframe) => {
        acc.push({
          time: keyframe.time,
          bones: [
            {
              name: keyframe.bone,
              position: keyframe.position || [0, 0, 0],
              rotation: keyframe.rotation || [0, 0, 0, 1],
              scale: keyframe.scale || [1, 1, 1],
            },
          ],
        });
        return acc;
      }, [] as AnimationData['keyframes']),
    };
  }, [signInfo]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Reference</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sign dictionary</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
          Browse the built-in avatar sign library. Search for a word to preview its animation, description, and keyframes.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1">
            {signs.length ? `${signs.length.toLocaleString()} signs indexed` : 'No signs loaded yet'}
          </span>
          {lastRefreshed && <span>Last refreshed {lastRefreshed.toLocaleTimeString()}</span>}
          <button
            type="button"
            onClick={loadSigns}
            className="text-primary-500 font-semibold"
            disabled={isLoadingList}
          >
            {isLoadingList ? 'Refreshing…' : 'Refresh list'}
          </button>
          {listError && <span className="text-red-400">{listError}</span>}
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Search signs</label>
            <input
              type="search"
              placeholder="e.g. hallo, danke"
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {letterOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`px-3 py-1 rounded-full border text-xs ${selectedLetter === 'all' ? 'border-primary-500 text-primary-600' : 'border-gray-200 dark:border-gray-700'}`}
                onClick={() => setSelectedLetter('all')}
              >
                All
              </button>
              {letterOptions.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`px-3 py-1 rounded-full border text-xs ${selectedLetter === letter ? 'border-primary-500 text-primary-600' : 'border-gray-200 dark:border-gray-700'}`}
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 max-h-[480px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {isLoadingList && <p className="text-sm text-gray-500 py-4">Loading signs…</p>}
            {!isLoadingList && filteredSigns.length === 0 && (
              <p className="text-sm text-gray-500 py-4">
                {query || selectedLetter !== 'all'
                  ? 'No matches for current filters'
                  : 'No signs available yet. Try refreshing.'}
              </p>
            )}
            {!isLoadingList && filteredSigns.map((sign) => (
              <button
                type="button"
                key={sign}
                onClick={() => setSelectedSign(sign)}
                className={`w-full text-left px-3 py-2 text-sm transition ${
                  sign === selectedSign
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-200'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                }`}
              >
                {sign}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Selected sign</p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedSign ? selectedSign.toUpperCase() : '—'}
              </h2>
              {signInfo?.description && <p className="text-gray-500 mt-2 max-w-2xl">{signInfo.description}</p>}
            </div>
            {signInfo && (
              <div className="text-sm text-gray-500">
                Duration: <span className="font-semibold text-gray-900 dark:text-white">{signInfo.duration.toFixed(2)}s</span>
              </div>
            )}
          </div>

          <div>
            <AvatarViewer animation={animationData} />
            {isLoadingSign && <p className="text-sm text-gray-500 mt-3">Loading animation…</p>}
            {!selectedSign && !isLoadingSign && (
              <p className="text-sm text-gray-500 mt-3">Select a sign from the list to preview its avatar animation.</p>
            )}
          </div>

          {signInfo && (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 p-4 text-sm text-gray-600 dark:text-gray-300">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Metadata</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Keyframes</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{signInfo.keyframes.length}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Duration</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{signInfo.duration.toFixed(2)} seconds</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">First bone</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{signInfo.keyframes[0]?.bone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Last updated</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{lastRefreshed ? lastRefreshed.toLocaleDateString() : '—'}</dd>
                </div>
              </dl>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Keyframes</p>
            <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-2 text-left">Time (s)</th>
                    <th className="px-4 py-2 text-left">Bone</th>
                    <th className="px-4 py-2 text-left">Position</th>
                    <th className="px-4 py-2 text-left">Rotation</th>
                  </tr>
                </thead>
                <tbody>
                  {!signInfo && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Select a sign to inspect its keyframes.
                      </td>
                    </tr>
                  )}
                  {signInfo?.keyframes.map((kf, idx) => (
                    <tr key={`${kf.time}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-2">{kf.time.toFixed(2)}</td>
                      <td className="px-4 py-2">{kf.bone}</td>
                      <td className="px-4 py-2 font-mono text-xs">{kf.position?.map((v) => v.toFixed(2)).join(', ')}</td>
                      <td className="px-4 py-2 font-mono text-xs">{kf.rotation?.map((v) => v.toFixed(2)).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
