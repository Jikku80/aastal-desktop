import { useEffect, useRef } from 'react';
import { useBuilderStore } from './useBuilderState';

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 3000;
const RETRY_DELAY_MS = 5000;

/**
 * useAutoSave
 * Debounces 3 s after any isDirty change, then calls the save function.
 * On failure, retries up to 3 times with 5 s back-off before showing error.
 * Uses refs for all mutable state to avoid stale-closure bugs.
 */
export function useAutoSave(
  clinicId: string,
  saveFn: (snapshot: any) => Promise<void>
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef   = useRef(saveFn);
  const attemptsRef = useRef(0);

  // Keep saveFn ref current without re-triggering effect
  useEffect(() => { saveFnRef.current = saveFn; }, [saveFn]);

  const isDirty   = useBuilderStore(s => s.isDirty);
  const setStatus = useBuilderStore(s => s.setSaveStatus);

  const attemptSave = async () => {
    try {
      setStatus('saving');
      const snap = useBuilderStore.getState().getSnapshot();
      await saveFnRef.current(snap);
      attemptsRef.current = 0;
      useBuilderStore.setState({ isDirty: false });
      setStatus('saved');
      setTimeout(() => {
        if (useBuilderStore.getState().saveStatus === 'saved') {
          setStatus('idle');
        }
      }, 3000);
    } catch (err) {
      attemptsRef.current += 1;
      console.error(`Auto-save attempt ${attemptsRef.current} failed:`, err);

      if (attemptsRef.current < MAX_RETRIES) {
        // Schedule a retry — the store still has isDirty=true so the
        // effect won't re-fire (isDirty didn't change), so we retry manually.
        if (retryRef.current) clearTimeout(retryRef.current);
        retryRef.current = setTimeout(attemptSave, RETRY_DELAY_MS);
      } else {
        attemptsRef.current = 0;
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    if (!isDirty) return;

    // Cancel any pending debounce or retry
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (retryRef.current)    clearTimeout(retryRef.current);
    attemptsRef.current = 0;

    debounceRef.current = setTimeout(attemptSave, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);
}