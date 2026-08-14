import { useEffect, useRef } from 'react';

/**
 * Polls only after the previous async call has settled. Polling pauses while the
 * tab is hidden and resumes immediately when it becomes visible again.
 */
export default function useNonOverlappingPolling(action, interval, { enabled = true, immediate = true } = {}) {
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; }, [action]);

  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    let timerId = null;

    const schedule = (delay = interval) => {
      if (!disposed) timerId = window.setTimeout(run, delay);
    };
    const run = async () => {
      if (disposed) return;
      if (document.visibilityState === 'hidden') {
        schedule();
        return;
      }
      try { await actionRef.current(); }
      finally { schedule(); }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || disposed) return;
      window.clearTimeout(timerId);
      schedule(0);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    schedule(immediate ? 0 : interval);
    return () => {
      disposed = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, immediate, interval]);
}
