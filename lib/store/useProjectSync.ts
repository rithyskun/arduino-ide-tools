import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useIDEStore } from '@/lib/store';

// ── Timing constants ────────────────────────────────────────────────────────
//
// Strategy: two-tier save system
//
//  1. DEBOUNCE — fires DEBOUNCE_DELAY ms after the *last* content change.
//     Rapid typing resets the timer each keystroke, so a save only happens
//     once the user pauses. This is the primary save path.
//
//  2. HEARTBEAT — a periodic fallback that saves any pending changes even if
//     the user never pauses long enough to let the debounce fire (e.g. they
//     paste 10 000 lines continuously). Also catches changes missed due to
//     unmount races or AbortErrors.
//
// Together they guarantee: max write latency = HEARTBEAT_INTERVAL,
// typical write latency = DEBOUNCE_DELAY after last keystroke.

const DEBOUNCE_DELAY    = 10_000; // 10 s after last change  (was 3 s always)
const HEARTBEAT_INTERVAL = 60_000; // 1 min fallback ceiling  (new)
const MIN_SAVE_INTERVAL  =  5_000; // never save more than once per 5 s (guard)

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function useProjectSync({ guestMode = false }: { guestMode?: boolean } = {}) {
  const { data: session, status } = useSession();
  const { activeProjectId, projects } = useIDEStore();

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef  = useRef<string>('');
  const lastSaveTime  = useRef<number>(0);
  const savingRef     = useRef(false);
  const abortRef      = useRef<AbortController | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // ── Build a snapshot of only the fields we persist ─────────────────────
  const snapshot = useCallback((projectId: string): string | null => {
    const project = useIDEStore.getState().projects.find((p) => p.id === projectId);
    if (!project) return null;
    return JSON.stringify({
      name: project.name,
      boardId: project.boardId,
      files: project.files.map((f) => ({
        name: f.name,
        content: f.content,
        language: f.language,
        readonly: f.readonly ?? false,
      })),
    });
  }, []);

  // ── Core save function ──────────────────────────────────────────────────
  const save = useCallback(
    async (projectId: string, { force = false } = {}) => {
      if (guestMode || status !== 'authenticated' || !session?.user) return;
      if (savingRef.current) return; // a save is already in-flight

      const snap = snapshot(projectId);
      if (!snap) return;

      // Skip if nothing changed since last save
      if (!force && snap === lastSavedRef.current) return;

      // Throttle: never save more frequently than MIN_SAVE_INTERVAL
      const now = Date.now();
      if (!force && now - lastSaveTime.current < MIN_SAVE_INTERVAL) return;

      savingRef.current = true;
      setSaveStatus('saving');

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: snap,
          signal: abortRef.current.signal,
        });

        if (res.ok) {
          lastSavedRef.current = snap;
          lastSaveTime.current = Date.now();
          setSaveStatus('saved');
          // Mark all files as saved in the store
          const project = useIDEStore.getState().projects.find((p) => p.id === projectId);
          if (project) {
            const store = useIDEStore.getState();
            project.files.forEach((f) => store.markFileSaved(f.name));
          }
        } else if (res.status === 401) {
          // Session expired — allow retry after re-auth
          lastSavedRef.current = '';
          setSaveStatus('error');
        } else if (res.status === 404) {
          // Project deleted — stop trying
          lastSavedRef.current = snap;
          setSaveStatus('idle');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Intentionally cancelled — don't update status
        } else {
          // Network error — will retry on next heartbeat or change
          lastSavedRef.current = '';
          setSaveStatus('error');
          console.warn('[useProjectSync] Save failed:', err);
        }
      } finally {
        savingRef.current = false;
        abortRef.current = null;
      }
    },
    [guestMode, status, session, snapshot]
  );

  // ── Debounced save on content change ───────────────────────────────────
  // Fires DEBOUNCE_DELAY ms after the last change — resets on every update.
  // The `projects` dep means this fires when any project content changes,
  // but the snapshot diff inside `save` ensures we only hit the DB when
  // something actually changed.
  useEffect(() => {
    if (guestMode || !activeProjectId || status !== 'authenticated') return;

    // Mark as pending immediately so the UI reflects unsaved state
    const snap = snapshot(activeProjectId);
    if (snap && snap !== lastSavedRef.current) {
      setSaveStatus('pending');
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(activeProjectId), DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestMode, activeProjectId, projects, status]);

  // ── Heartbeat: periodic fallback save ─────────────────────────────────
  // Catches changes that the debounce missed (e.g. user typing non-stop,
  // or the component unmounting before the debounce fired).
  useEffect(() => {
    if (guestMode || !activeProjectId || status !== 'authenticated') return;

    heartbeatRef.current = setInterval(() => {
      if (activeProjectId) save(activeProjectId);
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [guestMode, activeProjectId, status, save]);

  // ── Save on visibility change (tab switch / minimize) ─────────────────
  // Fires immediately when the user switches away — catches edits before
  // they close the tab without triggering beforeunload.
  useEffect(() => {
    if (guestMode) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeProjectId) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(activeProjectId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [guestMode, activeProjectId, save]);

  // ── Save on page unload (best-effort) ─────────────────────────────────
  useEffect(() => {
    if (guestMode) return;
    const handleBeforeUnload = () => {
      if (activeProjectId && !savingRef.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(activeProjectId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [guestMode, activeProjectId, save]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────
  return {
    saveStatus,
    saveNow: () => {
      if (!guestMode && activeProjectId) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(activeProjectId, { force: true }).catch(() => {/* best-effort */});
      }
    },
  };
}
