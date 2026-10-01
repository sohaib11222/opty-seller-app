import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Keeps server-backed views fresh while the application is active. */
export function useAutoRefresh(refresh: () => void | Promise<void>, enabled = true, intervalMs = 20_000, refreshKey?: unknown) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let refreshing = false;
    const run = () => {
      if (disposed || refreshing) return;
      refreshing = true;
      void Promise.resolve(refreshRef.current()).finally(() => { refreshing = false; });
    };
    const initial = setTimeout(run, 0);
    const interval = setInterval(run, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
    return () => { disposed = true; clearTimeout(initial); clearInterval(interval); subscription.remove(); };
  }, [enabled, intervalMs, refreshKey]);
}
