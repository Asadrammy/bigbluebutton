'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ApiError, SignLanguage } from '@/lib/api/types';
import { signToText } from '@/lib/api/translation';
import { useAuth } from '@/context/auth-context';
import { saveHistory } from '@/lib/api/history';
import { useUserSettings } from '@/hooks/use-user-settings';
import { WebcamCapture } from '@/components/webcam-capture';

const SIGN_LANGUAGES: SignLanguage[] = [
  'DGS', 'ASL', 'JSL', 'ÖGS', 'DSGS', 'LSF', 'LSFB', 'LSL', 'LSR', 'BSL', 'ISL',
  'NGT', 'VGT', 'LSE', 'LSC', 'LSCV', 'LGP', 'LIS', 'SMSL', 'STS', 'FSL', 'FSGL',
  'NSL', 'DTS', 'ÍTM', 'PJM', 'ČZJ', 'SPJ', 'MJNY', 'RSL-RO', 'BSL-BG', 'GSL',
  'TID', 'RSL', 'USL', 'BSL-BY', 'LSL-LT', 'LSL-LV', 'ESL'
];
const CAPTURE_INTERVAL_MS = 250;
const MAX_FRAMES = 48;

export default function SignToTextPage() {
  const { accessToken } = useAuth();
  const { settings: userSettings } = useUserSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ text: string; confidence: number; language: string } | null>(null);
  const [selectedSignLanguage, setSelectedSignLanguage] = useState<SignLanguage>('DGS');
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ApiError | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCaptureSummary, setLastCaptureSummary] = useState<string>('No captures yet');

  useEffect(() => {
    if (!defaultsApplied && userSettings) {
      const defaultSign =
        (userSettings.translator_defaults?.sign_to_text_language as SignLanguage | undefined) ||
        (userSettings.sign_language as SignLanguage);
      if (defaultSign) {
        setSelectedSignLanguage(defaultSign);
      }
      setDefaultsApplied(true);
    }
  }, [defaultsApplied, userSettings]);
  const handleCaptureComplete = async (frames: string[]) => {
    if (!frames.length) {
      toast.error('No frames captured. Please try again.');
      return;
    }

    const framesCaptured = frames.length;
    setResult(null);
    setIsSubmitting(true);
    setLastCaptureSummary(`Processing ${framesCaptured} frame${framesCaptured === 1 ? '' : 's'}…`);
    try {
      const response = await signToText({
        video_frames: frames,
        sign_language: selectedSignLanguage,
      });
      setResult(response);
      setErrorInfo(null);
      toast.success('Translation complete');
      setLastCaptureSummary(
        `Captured ${framesCaptured} frame${framesCaptured === 1 ? '' : 's'} · ${new Date().toLocaleTimeString()}`,
      );

      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: `Sign capture (${framesCaptured} frames)`,
            target_text: response.text,
            source_language: selectedSignLanguage,
            target_language: response.language,
            translation_type: 'sign',
            confidence: response.confidence,
          });
        } catch (historyError) {
          console.warn('Failed to save history', historyError);
        }
      }
    } catch (error) {
      console.error(error);
      const apiError = (error as ApiError) ?? { message: 'Failed to process video', code: 'unknown' };
      setErrorInfo(apiError);
      toast.error(apiError.message || 'Failed to process video');
      setLastCaptureSummary(`Capture failed · ${apiError.message}`);
      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: `Sign capture (${framesCaptured} frames)`,
            target_text: `ERROR: ${apiError.message}`,
            source_language: 'sign',
            target_language: 'text',
            translation_type: 'sign',
          });
        } catch (historyError) {
          console.warn('Failed to log error history', historyError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Phase 1 live prototype</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">Sign Language → Text</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
          Capture webcam footage, batch frames locally, and send them to the FastAPI sign recognition
          service. This mimics the React Native flow and keeps tokens on the client side.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <WebcamCapture
            onCaptureComplete={handleCaptureComplete}
            intervalMs={CAPTURE_INTERVAL_MS}
            maxFrames={MAX_FRAMES}
            disabled={isSubmitting}
            onError={setStreamError}
            onRecordingChange={setIsRecording}
          />

          <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500">
            <label className="flex items-center gap-2">
              <span className="uppercase text-xs tracking-wide text-gray-400">Sign language</span>
              <select
                className="border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 bg-transparent text-sm"
                value={selectedSignLanguage}
                disabled={isSubmitting || isRecording}
                onChange={(event) => setSelectedSignLanguage(event.target.value as SignLanguage)}
              >
                {SIGN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
            {streamError && <span className="text-red-400">{streamError}</span>}
            {!streamError && (
              <span
                className={
                  isRecording
                    ? 'text-primary-500 font-semibold'
                    : isSubmitting
                      ? 'text-amber-500'
                      : 'text-gray-400'
                }
              >
                {isRecording ? 'Recording…' : isSubmitting ? 'Processing capture…' : 'Ready'}
              </span>
            )}
            <span className="text-gray-400 text-xs">{lastCaptureSummary}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Translation Result</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Results appear here after you stop recording.
            </p>
          </div>

          {result ? (
            <div className="space-y-3">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{result.text}</p>
              <p className="text-sm text-gray-500">
                Confidence: {(result.confidence * 100).toFixed(1)}% · Language: {result.language.toUpperCase()}
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No translation yet.</div>
          )}

          {errorInfo && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              <p className="font-semibold">Last error</p>
              <p>{errorInfo.message}</p>
              {errorInfo.details !== undefined && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-red-900/20 p-2 text-xs">
                  {typeof errorInfo.details === 'string'
                    ? errorInfo.details
                    : JSON.stringify(errorInfo.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400">
            Frames are processed locally and discarded after submission. Increase MAX_FRAMES in code if you
            need longer sequences.
          </div>
        </div>
      </section>
    </div>
  );
}
