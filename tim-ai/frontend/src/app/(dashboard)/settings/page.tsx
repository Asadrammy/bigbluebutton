'use client';

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { getSettings, updateSettings } from '@/lib/api/auth';
import type {
  QualityLevel,
  SignLanguage,
  SpokenLanguage,
  UserSettings,
  TranslatorDefaults,
} from '@/lib/api/types';
import type { UpdateSettingsPayload } from '@/lib/api/auth';

const SPOKEN_LANGUAGES: SpokenLanguage[] = ['de', 'en', 'es', 'fr', 'ar'];
const SIGN_LANGUAGES: SignLanguage[] = ['DGS', 'ASL', 'BSL', 'LSF', 'LIS', 'LSE', 'NGT', 'OGS', 'SSL'];
const QUALITY_OPTIONS: QualityLevel[] = ['low', 'medium', 'high'];

function buildSettingsPayload(settings: UserSettings): UpdateSettingsPayload {
  const payload: UpdateSettingsPayload = {
    preferred_language: settings.preferred_language,
    sign_language: settings.sign_language,
    video_quality: settings.video_quality,
    audio_quality: settings.audio_quality,
  };

  const translatorDefaults = settings.translator_defaults;
  if (translatorDefaults) {
    const cleaned = Object.fromEntries(
      Object.entries(translatorDefaults).filter(([, value]) => Boolean(value)),
    ) as TranslatorDefaults;
    if (Object.keys(cleaned).length > 0) {
      payload.translator_defaults = cleaned;
    }
  }

  return payload;
}

export default function SettingsPage() {
  const { accessToken, user, setUserData } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setSettings(null);
      setInitialSettings(null);
      return;
    }

    const token = accessToken;

    async function fetchSettings() {
      setIsLoading(true);
      try {
        const response = await getSettings(token);
        const normalized: UserSettings = {
          ...response,
          translator_defaults: response.translator_defaults ?? {},
        };
        setSettings(normalized);
        setInitialSettings(normalized);
      } catch (error) {
        console.error(error);
        toast.error((error as { message?: string })?.message || 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [accessToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !accessToken) return;

    setIsSaving(true);
    try {
      const payload = buildSettingsPayload(settings);
      const updated = await updateSettings(accessToken, payload);
      const normalized: UserSettings = {
        ...updated,
        translator_defaults: updated.translator_defaults ?? {},
      };
      setSettings(normalized);
      setInitialSettings(normalized);
      if (user) {
        setUserData({ ...user, preferred_language: updated.preferred_language, sign_language: updated.sign_language });
      }
      toast.success('Settings updated');
    } catch (error) {
      console.error(error);
      toast.error((error as { message?: string })?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = isLoading || !settings;
  const showSkeleton = isLoading && !settings;
  const translatorDefaults = settings?.translator_defaults ?? {};
  const isDirty = useMemo(() => {
    if (!settings || !initialSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  const statusLabel = isLoading
    ? 'Loading settings…'
    : isDirty
    ? 'Unsaved changes'
    : 'All changes saved';
  const statusColor = isLoading ? 'text-amber-500' : isDirty ? 'text-primary-500' : 'text-emerald-500';

  function updateTranslatorDefault<T extends keyof TranslatorDefaults>(key: T, value: TranslatorDefaults[T]) {
    setSettings((prev) => {
      if (!prev) return prev;
      const nextDefaults: TranslatorDefaults = { ...(prev.translator_defaults ?? {}) };
      if (!value) {
        delete nextDefaults[key];
      } else {
        nextDefaults[key] = value;
      }
      return {
        ...prev,
        translator_defaults: nextDefaults,
      };
    });
  }

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wide text-gray-500">Preferences</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
            Choose your default spoken & sign languages and fine tune audio/video quality.
          </p>
        </header>
        <div className="space-y-4">
          {[1, 2].map((key) => (
            <div key={key} className="h-48 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Preferences</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
          Choose your default spoken & sign languages and fine tune audio/video quality.
        </p>
        <div className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-6 max-w-3xl"
        aria-busy={isLoading || isSaving}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Preferred spoken language</label>
          <select
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
            value={settings?.preferred_language || ''}
            disabled={disabled}
            onChange={(event) =>
              setSettings((prev) => (prev ? { ...prev, preferred_language: event.target.value as SpokenLanguage } : prev))
            }
          >
            {SPOKEN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Preferred sign language</label>
          <select
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
            value={settings?.sign_language || ''}
            disabled={disabled}
            onChange={(event) =>
              setSettings((prev) => (prev ? { ...prev, sign_language: event.target.value as SignLanguage } : prev))
            }
          >
            {SIGN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Video quality</label>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
              value={settings?.video_quality || ''}
              disabled={disabled}
              onChange={(event) =>
                setSettings((prev) => (prev ? { ...prev, video_quality: event.target.value as QualityLevel } : prev))
              }
            >
              {QUALITY_OPTIONS.map((quality) => (
                <option key={quality} value={quality}>
                  {quality.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Audio quality</label>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
              value={settings?.audio_quality || ''}
              disabled={disabled}
              onChange={(event) =>
                setSettings((prev) => (prev ? { ...prev, audio_quality: event.target.value as QualityLevel } : prev))
              }
            >
              {QUALITY_OPTIONS.map((quality) => (
                <option key={quality} value={quality}>
                  {quality.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-black/20 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Translator defaults</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            These presets auto-fill the translator tools across the dashboard.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Sign → Text default sign language</label>
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={translatorDefaults.sign_to_text_language || ''}
                disabled={disabled}
                onChange={(event) =>
                  updateTranslatorDefault('sign_to_text_language', event.target.value as SignLanguage)
                }
              >
                <option value="">Use global sign preference ({settings?.sign_language})</option>
                {SIGN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Speech → Sign spoken language</label>
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={translatorDefaults.speech_to_sign_spoken_language || ''}
                disabled={disabled}
                onChange={(event) =>
                  updateTranslatorDefault('speech_to_sign_spoken_language', event.target.value as SpokenLanguage)
                }
              >
                <option value="">Use global spoken preference ({settings?.preferred_language})</option>
                {SPOKEN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Speech → Sign sign language</label>
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={translatorDefaults.speech_to_sign_sign_language || ''}
                disabled={disabled}
                onChange={(event) =>
                  updateTranslatorDefault('speech_to_sign_sign_language', event.target.value as SignLanguage)
                }
              >
                <option value="">Use global sign preference ({settings?.sign_language})</option>
                {SIGN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Text translator source language</label>
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={translatorDefaults.text_source_language || ''}
                disabled={disabled}
                onChange={(event) =>
                  updateTranslatorDefault('text_source_language', event.target.value as SpokenLanguage)
                }
              >
                <option value="">Use global spoken preference ({settings?.preferred_language})</option>
                {SPOKEN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Text translator target language</label>
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={translatorDefaults.text_target_language || ''}
                disabled={disabled}
                onChange={(event) =>
                  updateTranslatorDefault('text_target_language', event.target.value as SpokenLanguage)
                }
              >
                <option value="">Use opposite of global preference</option>
                {SPOKEN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || isSaving || !isDirty}
          className="px-6 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-40"
        >
          {isSaving ? 'Saving…' : isDirty ? 'Save changes' : 'Nothing to save'}
        </button>
      </form>
    </div>
  );
}
