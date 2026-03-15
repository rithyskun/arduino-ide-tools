import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useIDEStore } from '@/lib/store';

const AUTOSAVE_DELAY = 3000; // ms after last change

export function useProjectSync() {
  const { data: session, status } = useSession();
  const { activeProjectId, projects } = useIDEStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const savingRef = useRef(false);

  const save = useCallback(
    async (projectId: string) => {
      if (status !== 'authenticated' || !session?.user) return;
      if (savingRef.current) return; // prevent concurrent saves

      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      // Skip if nothing changed since last save
      const snapshot = JSON.stringify({
        name: project.name,
        boardId: project.boardId,
        files: project.files.map((f) => ({ name: f.name, content: f.content })),
      });
      if (snapshot === lastSavedRef.current) return;
      lastSavedRef.current = snapshot;
      savingRef.current = true;

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          // No Authorization header needed — NextAuth cookie is sent automatically
          body: JSON.stringify({
            name: project.name,
            boardId: project.boardId,
            files: project.files.map((f) => ({
              name: f.name,
              content: f.content,
              language: f.language,
              readonly: f.readonly ?? false,
            })),
          }),
        });

        if (res.ok) {
          // Mark all files as saved in the store
          const store = useIDEStore.getState();
          project.files.forEach((f) => store.markFileSaved(f.name));
        } else if (res.status === 401) {
          // Session expired — don't spam retries
          lastSavedRef.current = '';
        }
      } catch {
        // Network error — will retry on next change
        lastSavedRef.current = '';
      } finally {
        savingRef.current = false;
      }
    },
    [status, session, projects]
  );

  // Debounced auto-save on every project change
  useEffect(() => {
    if (!activeProjectId || status !== 'authenticated') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(activeProjectId), AUTOSAVE_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeProjectId, projects, status, save]);

  // Force-save before page unload
  useEffect(() => {
    const onUnload = () => {
      if (activeProjectId) save(activeProjectId);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [activeProjectId, save]);

  return {
    saveNow: () => {
      if (activeProjectId) save(activeProjectId);
    },
  };
}
