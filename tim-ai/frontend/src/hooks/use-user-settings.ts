import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getSettings } from '@/lib/api/auth';
import type { UserSettings } from '@/lib/api/types';

export function useUserSettings() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setSettings(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getSettings(accessToken)
      .then((response) => {
        if (!cancelled) {
          setSettings(response);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err as Error);
        }
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

  return { settings, isLoading, error };
}
