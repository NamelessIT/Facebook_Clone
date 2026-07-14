import { useCallback, useRef, useState } from 'react';

/**
 * Wrap an async action so it cannot run concurrently. While a call is in flight,
 * further invocations are ignored (returns undefined). Prevents double-submit on
 * POST/PUT/PATCH/DELETE buttons.
 *
 * @param {(...args:any[]) => Promise<any>} action
 * @returns {{ run: (...args:any[]) => Promise<any>, isRunning: boolean }}
 */
export default function useSingleFlightAction(action) {
  const [isRunning, setIsRunning] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setIsRunning(true);
    try {
      return await action(...args);
    } finally {
      inFlight.current = false;
      setIsRunning(false);
    }
  }, [action]);

  return { run, isRunning };
}
