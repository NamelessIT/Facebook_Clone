import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a throttled version of `action` that runs at most once per `interval`
 * ms (leading edge). Good for reaction toggles, scroll / load-more handlers.
 *
 * @param {(...args:any[]) => void} action
 * @param {number} interval ms (default 500)
 */
export default function useThrottledAction(action, interval = 500) {
  const lastRun = useRef(0);
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; }, [action]);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRun.current < interval) return undefined;
    lastRun.current = now;
    return actionRef.current(...args);
  }, [interval]);
}
