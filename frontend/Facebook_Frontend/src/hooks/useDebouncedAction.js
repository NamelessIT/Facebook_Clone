import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced version of `action`. Rapid calls collapse into one call
 * that fires `delay` ms after the last invocation. Good for search inputs and
 * autosave. The pending timer is cleared on unmount.
 *
 * @param {(...args:any[]) => void} action
 * @param {number} delay ms (default 300)
 */
export default function useDebouncedAction(action, delay = 300) {
  const timer = useRef(null);
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; }, [action]);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const debounced = useCallback((...args) => {
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      actionRef.current(...args);
    }, delay);
  }, [cancel, delay]);

  return debounced;
}
