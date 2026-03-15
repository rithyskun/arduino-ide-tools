import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useIDEStore } from '@/lib/store';

const AUTOSAVE_DELAY = 3000; // ms after last change before saving

export function useProjectSync({ guestMode = false }: { guestMode?: boolean } = {}) {
  const { data: session, status } = useSession();
  const { activeProjectId, projects } = useIDEStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const savingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const save = useCallback(
    async (projectId: string) => {
      if (guestMode || status !== 'authenticated' || !session?.user) return;
      // Don't queue another save while one is in flight
      if (savingRef.current) return;

      const project = useIDEStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return;

      // Deep-compare only the fields we persist to avoid unnecessary saves
      const snapshot = JSON.stringify({
        name: project.name,
        boardId: project.boardId,
        files: project.files.map((f) => ({
          name: f.name,
          content: f.content,
          language: f.language,
          readonly: f.readonly ?? false,
        })),
      });

      if (snapshot === lastSavedRef.current) return;

      savingRef.current = true;

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: snapshot,
          signal: abortRef.current.signal,
        });

        if (res.ok) {
          lastSavedRef.current = snapshot;
          // Mark all files as saved in the store
          const store = useIDEStore.getState();
          project.files.forEach((f) => store.markFileSaved(f.name));
        } else if (res.status === 401) {
          // Session expired — clear saved snapshot to force retry after re-auth
          lastSavedRef.current = '';
        } else if (res.status === 404) {
          // Project was deleted, don't retry
          lastSavedRef.current = snapshot;
          console.warn('[useProjectSync] Project not found:', projectId);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Network error — will retry on next change
          lastSavedRef.current = '';
          console.warn('[useProjectSync] Save failed:', err);
        }
      } finally {
        savingRef.current = false;
        abortRef.current = null;
      }
    },
    [guestMode, status, session]
    // NOTE: `projects` intentionally NOT in deps — we read it from the store
    // at save time to avoid stale closures and infinite loops
  );

  // Debounced auto-save whenever the active project's content changes
  useEffect(() => {
    if (guestMode || !activeProjectId || status !== 'authenticated') return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(activeProjectId), AUTOSAVE_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestMode, activeProjectId, projects, status]);

  // Immediate save before the page unloads (best-effort, synchronous-ish)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeProjectId && !savingRef.current) {
        // Cancel the pending debounced save and fire immediately
        if (timerRef.current) clearTimeout(timerRef.current);
        save(activeProjectId).catch(() => { /* best-effort */ });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeProjectId, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    saveNow: () => {
      if (!guestMode && activeProjectId) {
        if (timerRef.current) clearTimeout(timerRef.current);
        save(activeProjectId).catch(() => { /* best-effort */ });
      }
    },
  };
}