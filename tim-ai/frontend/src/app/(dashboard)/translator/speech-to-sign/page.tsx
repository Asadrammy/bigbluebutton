'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { speechToText, textToSign } from '@/lib/api/translation';
import type { AnimationData, SignLanguage, SpokenLanguage, ApiError } from '@/lib/api/types';
import { AvatarViewer } from '@/components/avatar-viewer';
import { useAuth } from '@/context/auth-context';
import { saveHistory } from '@/lib/api/history';
import { useUserSettings } from '@/hooks/use-user-settings';
import { AudioRecorder } from '@/components/audio-recorder';

const SPOKEN_LANGUAGES: SpokenLanguage[] = ['de', 'en', 'es', 'fr', 'ar'];
const SIGN_LANGUAGES: SignLanguage[] = ['DGS', 'ASL', 'BSL', 'LSF', 'LIS', 'LSE', 'NGT', 'OGS', 'SSL'];

export default function SpeechToSignPage() {
  const { accessToken } = useAuth();
  const { settings: userSettings } = useUserSettings();
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [selectedSpokenLanguage, setSelectedSpokenLanguage] = useState<SpokenLanguage>('en');
  const [selectedSignLanguage, setSelectedSignLanguage] = useState<SignLanguage>('DGS');
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ApiError | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastTranscriptSummary, setLastTranscriptSummary] = useState<string>('No recordings yet');

  useEffect(() => {
    if (!defaultsApplied && userSettings) {
      const defaultSpeech =
        (userSettings.translator_defaults?.speech_to_sign_spoken_language as SpokenLanguage | undefined) ||
        (userSettings.preferred_language as SpokenLanguage);
      const defaultSign =
        (userSettings.translator_defaults?.speech_to_sign_sign_language as SignLanguage | undefined) ||
        (userSettings.sign_language as SignLanguage);
      if (defaultSpeech) setSelectedSpokenLanguage(defaultSpeech);
      if (defaultSign) setSelectedSignLanguage(defaultSign);
      setDefaultsApplied(true);
    }
  }, [defaultsApplied, userSettings]);

  const processAudio = async (base64Audio: string) => {
    setIsSubmitting(true);
    try {
      const stt = await speechToText({
        audio_data: base64Audio,
        language: selectedSpokenLanguage,
      });
      setTranscript(stt.text);
      setLastTranscriptSummary(`Captured ${(stt.text || '').split(' ').filter(Boolean).length} words · ${new Date().toLocaleTimeString()}`);

      const animation = await textToSign({
        text: stt.text,
        sign_language: selectedSignLanguage,
        source_language: stt.language,
      });

      setAnimationData(animation.animation_data ?? null);
      setAvatarPreview(JSON.stringify(animation.animation_data ?? animation, null, 2));
      setErrorInfo(null);
      toast.success('Avatar instructions generated');

      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: stt.text,
            target_text: `[avatar animation · ${selectedSignLanguage}]`,
            source_language: stt.language,
            target_language: selectedSignLanguage,
            translation_type: 'speech',
            confidence: stt.confidence,
          });
        } catch (historyError) {
          console.warn('Failed to save history', historyError);
        }
      }
    } catch (error) {
      console.error(error);
      const apiError = (error as ApiError) ?? { message: 'Failed to process audio', code: 'unknown' };
      setErrorInfo(apiError);
      toast.error(apiError.message || 'Failed to process audio');
      setLastTranscriptSummary(`Recording failed · ${apiError.message}`);
      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: transcript || '[speech input]',
            target_text: `ERROR: ${apiError.message}`,
            source_language: selectedSpokenLanguage,
            target_language: selectedSignLanguage,
            translation_type: 'speech',
          });
        } catch (historyError) {
          console.warn('Failed to log error history', historyError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudioReady = async (base64Audio: string) => {
    setTranscript('');
    setAvatarPreview('');
    setAnimationData(null);
    await processAudio(base64Audio);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Phase 1 live prototype</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">Speech → Sign Language</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
          Record speech, run Whisper/STT on the backend, then convert the transcript into avatar animation
          instructions using the Text-to-Sign pipeline.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AudioRecorder
            onAudioReady={handleAudioReady}
            disabled={isSubmitting}
            onError={setStreamError}
            onRecordingChange={setIsRecording}
          />

          <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500">
            <label className="flex items-center gap-2">
              <span className="uppercase text-xs tracking-wide text-gray-400">Speech language</span>
              <select
                className="border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 bg-transparent text-sm"
                value={selectedSpokenLanguage}
                disabled={isSubmitting || isRecording}
                onChange={(event) => setSelectedSpokenLanguage(event.target.value as SpokenLanguage)}
              >
                {SPOKEN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="uppercase text-xs tracking-wide text-gray-400">Target sign language</span>
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
                {isRecording ? 'Recording…' : isSubmitting ? 'Processing audio…' : 'Ready'}
              </span>
            )}
            <span className="text-gray-400 text-xs">{lastTranscriptSummary}</span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Transcript</h3>
            {transcript ? (
              <p className="mt-3 text-gray-900 dark:text-gray-100 text-lg">{transcript}</p>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No transcript yet.</p>
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
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark-border-gray-800 bg-white dark:bg-dark-primary p-6 flex flex-col">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Avatar animation payload</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Direct response from <code className="font-mono text-xs">/text-to-sign</code>. Hook this up to the
              Three.js avatar viewer in Phase 2.
            </p>
          </div>
          <div className="mt-4">
            <AvatarViewer animation={animationData} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={() => setAvatarPreview(JSON.stringify(animationData ?? {}, null, 2))}
              disabled={!animationData}
              className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 font-semibold disabled:opacity-50"
            >
              Reveal raw JSON
            </button>
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                setAvatarPreview('');
                setAnimationData(null);
              }}
              disabled={!transcript && !animationData}
              className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 font-semibold disabled:opacity-50"
            >
              Clear preview
            </button>
          </div>
          <pre className="mt-4 flex-1 bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-auto">
            {avatarPreview || '// Awaiting recording…'}
          </pre>
        </div>
      </section>
    </div>
  );
}
