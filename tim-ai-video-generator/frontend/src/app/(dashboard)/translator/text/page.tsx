'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { translate } from '@/lib/api/translation';
import type { ApiError, SpokenLanguage } from '@/lib/api/types';
import { useAuth } from '@/context/auth-context';
import { saveHistory } from '@/lib/api/history';
import { useUserSettings } from '@/hooks/use-user-settings';

const SPOKEN_LANGUAGES: SpokenLanguage[] = ['de', 'en', 'es', 'fr', 'ar'];

export default function TextTranslatorPage() {
  const { accessToken } = useAuth();
  const { settings: userSettings } = useUserSettings();
  const [sourceLanguage, setSourceLanguage] = useState<SpokenLanguage>('de');
  const [targetLanguage, setTargetLanguage] = useState<SpokenLanguage>('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!defaultsApplied && userSettings) {
      const defaultSource =
        (userSettings.translator_defaults?.text_source_language as SpokenLanguage | undefined) ||
        (userSettings.preferred_language as SpokenLanguage);
      const defaultTarget = userSettings.translator_defaults?.text_target_language as SpokenLanguage | undefined;
      if (defaultSource) setSourceLanguage(defaultSource);
      if (defaultTarget) setTargetLanguage(defaultTarget);
      setDefaultsApplied(true);
    }
  }, [defaultsApplied, userSettings]);

  const canSubmit = useMemo(() => sourceText.trim().length > 0 && sourceLanguage !== targetLanguage, [sourceText, sourceLanguage, targetLanguage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      toast.error('Enter some text and choose different languages');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translate({
        text: sourceText,
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
      });
      setTranslatedText(response.translated_text);
      setErrorInfo(null);
      toast.success('Translation complete');

      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: sourceText,
            target_text: response.translated_text,
            source_language: sourceLanguage,
            target_language: targetLanguage,
            translation_type: 'text',
          });
        } catch (historyError) {
          console.warn('Failed to save history', historyError);
        }
      }
    } catch (error) {
      console.error(error);
      const apiError = (error as ApiError) ?? { message: 'Failed to translate text', code: 'unknown' };
      setErrorInfo(apiError);
      toast.error(apiError.message || 'Failed to translate text');
      if (accessToken) {
        try {
          await saveHistory(accessToken, {
            source_text: sourceText,
            target_text: `ERROR: ${apiError.message}`,
            source_language: sourceLanguage,
            target_language: targetLanguage,
            translation_type: 'text',
          });
        } catch (historyError) {
          console.warn('Failed to log error history', historyError);
        }
      }
    } finally {
      setIsTranslating(false);
    }
  }

  function swapLanguages() {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-500">Translator</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Text ↔ Text</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-3xl">
          Translate between supported spoken languages. Text translations also power downstream avatar and speech workflows.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Source language</label>
          <select
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
            value={sourceLanguage}
            onChange={(event) => setSourceLanguage(event.target.value as SpokenLanguage)}
          >
            {SPOKEN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Type text to translate…"
            className="mt-2 h-56 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3 text-sm"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{sourceText.length} chars</span>
            <button type="button" onClick={() => setSourceText('')} className="text-primary-500 font-medium">
              Clear
            </button>
          </div>

          {errorInfo && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
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

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Target language</label>
          <select
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value as SpokenLanguage)}
          >
            {SPOKEN_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Translated text will appear here"
            className="mt-2 h-56 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 px-4 py-3 text-sm"
            value={translatedText}
            readOnly
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{translatedText.length} chars</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(translatedText)}
              className="text-primary-500 font-medium disabled:opacity-50"
              disabled={!translatedText}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={swapLanguages}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium"
          >
            Swap languages
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isTranslating}
            className="px-6 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-60"
          >
            {isTranslating ? 'Translating…' : 'Translate text'}
          </button>
        </div>
      </form>
    </div>
  );
}
