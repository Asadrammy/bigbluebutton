'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';

type Meeting = {
    meeting_id: string;
    meeting_name: string;
    join_url?: string;
    created?: boolean;
    message?: string;
};

export default function MeetingsPage() {
    const { accessToken } = useAuth();

    /* ───── state ───── */
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [meetingName, setMeetingName] = useState('');
    const [joinMeetingId, setJoinMeetingId] = useState('');
    const [fullName, setFullName] = useState('');
    const [joinUrl, setJoinUrl] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const headers = useCallback(
        () => ({
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        }),
        [accessToken],
    );

    /* ───── fetch meetings list ───── */
    const fetchMeetings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/meetings/list`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setMeetings(data.meetings ?? []);
            }
        } catch {
            /* BBB may not be configured yet */
        } finally {
            setLoading(false);
        }
    }, [API, headers]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    /* ───── create meeting ───── */
    const handleCreate = async () => {
        setCreating(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`${API}/api/v1/meetings/create`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    meeting_name: meetingName || 'Sign Language Meeting',
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(`Meeting "${data.meeting_name}" created (ID: ${data.meeting_id})`);
                setMeetingName('');
                fetchMeetings();
            } else {
                setError(data.detail || 'Failed to create meeting');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Network error');
        } finally {
            setCreating(false);
        }
    };

    /* ───── join meeting ───── */
    const handleJoin = async () => {
        if (!joinMeetingId || !fullName) {
            setError('Please enter both meeting ID and your name');
            return;
        }
        setError('');
        setJoinUrl('');
        try {
            const res = await fetch(`${API}/api/v1/meetings/join`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    meeting_id: joinMeetingId,
                    full_name: fullName,
                    role: 'attendee',
                }),
            });
            const data = await res.json();
            if (res.ok && data.join_url) {
                setJoinUrl(data.join_url);
            } else {
                setError(data.detail || 'Failed to get join URL');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Network error');
        }
    };

    /* ───── UI ───── */
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">BigBlueButton Meetings</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create or join video meetings with sign language translation
                </p>
            </div>

            {/* Status messages */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    {success}
                </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
                {/* Create Meeting */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-primary p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Create Meeting</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="meeting-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Meeting Name
                            </label>
                            <input
                                id="meeting-name"
                                type="text"
                                placeholder="Sign Language Meeting"
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="w-full rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
                        >
                            {creating ? 'Creating...' : 'Create Meeting'}
                        </button>
                    </div>
                </section>

                {/* Join Meeting */}
                <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-primary p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Join Meeting</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="join-meeting-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Meeting ID
                            </label>
                            <input
                                id="join-meeting-id"
                                type="text"
                                placeholder="sign-meeting-..."
                                value={joinMeetingId}
                                onChange={(e) => setJoinMeetingId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Your Name
                            </label>
                            <input
                                id="full-name"
                                type="text"
                                placeholder="Enter your name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            onClick={handleJoin}
                            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
                        >
                            Generate Join Link
                        </button>

                        {joinUrl && (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-3 space-y-2">
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Meeting ready!</p>
                                <a
                                    href={joinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                                >
                                    Open Meeting in New Tab
                                </a>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Active Meetings */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-primary p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Active Meetings</h3>
                    <button
                        onClick={fetchMeetings}
                        disabled={loading}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {meetings.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                        No active meetings. Create one above to get started.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {meetings.map((m) => (
                            <li key={m.meeting_id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-medium">{m.meeting_name}</p>
                                    <p className="text-xs text-slate-500">{m.meeting_id}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setJoinMeetingId(m.meeting_id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="rounded-lg bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-500/20 transition-colors"
                                >
                                    Join
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Integration Info */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6">
                <h3 className="text-lg font-semibold mb-2">Translation During Meetings</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    The AI Sign Translation panel is automatically available as an overlay during meetings.
                    It captures your microphone, converts speech to text, and displays sign language
                    animations via a 3D avatar. Use the{' '}
                    <strong>Speech → Sign</strong> page for standalone translation, or join a meeting
                    above for the integrated experience.
                </p>
            </section>
        </div>
    );
}
