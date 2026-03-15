'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useIDEStore } from '@/lib/store';
import { Loader2, AlertCircle } from 'lucide-react';

const IDE = dynamic(() => import('@/components/IDE'), { ssr: false });

function IDELoader() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const { createProject, projects, setActiveProject, activeProjectId } =
    useIDEStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Not logged in — send to login, preserving destination
    if (status === 'unauthenticated') {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
      return;
    }
    if (status !== 'authenticated') return; // still loading session

    async function boot() {
      setLoading(true);
      setError(null);

      try {
        if (projectId) {
          // ── Load specific project from DB ──────────────────────
          // Check if already in local Zustand store
          const inStore = useIDEStore
            .getState()
            .projects.find((p) => p.id === projectId);
          if (inStore) {
            setActiveProject(projectId);
            setLoading(false);
            return;
          }

          // Fetch from API
          const res = await fetch(`/api/projects/${projectId}`);
          if (!res.ok) {
            if (res.status === 404) {
              setError('Project not found. It may have been deleted.');
            } else if (res.status === 403) {
              setError('You do not have permission to open this project.');
            } else {
              setError(
                `Failed to load project (${res.status}). Please try again.`
              );
            }
            setLoading(false);
            return;
          }

          const { project } = await res.json();

          // Sync into Zustand store
          const store = useIDEStore.getState();
          const existing = store.projects.find((p) => p.id === project._id);
          if (!existing) {
            store.projects.push({
              id: project._id,
              name: project.name,
              boardId: project.boardId,
              files: project.files.map(
                (f: {
                  name: string;
                  content: string;
                  language: string;
                  readonly?: boolean;
                }) => ({
                  name: f.name,
                  content: f.content,
                  language: f.language,
                  readonly: f.readonly ?? false,
                  modified: false,
                })
              ),
              createdAt: new Date(project.createdAt).getTime(),
              updatedAt: new Date(project.updatedAt).getTime(),
            });
          }
          setActiveProject(project._id);
        } else {
          // ── No project ID — open most-recent or create blank ───
          if (projects.length > 0) {
            // Already have projects in store — just use the active one or first
            if (!activeProjectId) {
              setActiveProject(projects[0].id);
            }
          } else {
            // Fetch user's projects from API
            const res = await fetch('/api/projects?limit=1&sort=updatedAt');
            if (res.ok) {
              const data = await res.json();
              if (data.projects?.length > 0) {
                // Load the most recent project
                const latest = data.projects[0];
                const fullRes = await fetch(`/api/projects/${latest._id}`);
                if (fullRes.ok) {
                  const { project } = await fullRes.json();
                  const store = useIDEStore.getState();
                  store.projects.push({
                    id: project._id,
                    name: project.name,
                    boardId: project.boardId,
                    files: project.files.map(
                      (f: {
                        name: string;
                        content: string;
                        language: string;
                        readonly?: boolean;
                      }) => ({
                        name: f.name,
                        content: f.content,
                        language: f.language,
                        readonly: f.readonly ?? false,
                        modified: false,
                      })
                    ),
                    createdAt: new Date(project.createdAt).getTime(),
                    updatedAt: new Date(project.updatedAt).getTime(),
                  });
                  setActiveProject(project._id);
                }
              } else {
                // No projects at all — create a blank one
                createProject('My First Project', 'arduino-mega');
              }
            }
          }
        }
      } catch (err) {
        setError(
          'Network error — could not load project. Check your connection.'
        );
        console.error('[IDELoader]', err);
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [status, projectId]); // eslint-disable-line

  // ── Loading ────────────────────────────────────────────────────
  if (status === 'loading' || loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-3"
        style={{ background: 'var(--bg-base)' }}
      >
        <Loader2
          size={22}
          className="animate-spin"
          style={{ color: 'var(--accent-green)' }}
        />
        <p className="font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {projectId ? 'Loading project…' : 'Opening IDE…'}
        </p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <AlertCircle size={32} style={{ color: 'var(--accent-red)' }} />
        <p
          className="font-mono text-sm font-bold"
          style={{ color: 'var(--fg-default)' }}
        >
          Could not open project
        </p>
        <p
          className="font-mono text-xs max-w-sm"
          style={{ color: 'var(--fg-muted)' }}
        >
          {error}
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="font-mono text-xs px-4 py-2 rounded border transition-all"
            style={{
              background: 'var(--bg-raised)',
              color: 'var(--fg-default)',
              borderColor: 'var(--border-default)',
            }}
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="font-mono text-xs px-4 py-2 rounded border transition-all"
            style={{
              background: 'var(--tint-blue)',
              color: 'var(--accent-blue)',
              borderColor: 'var(--border-blue)',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <IDE />;
}

export default function IDEPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-screen"
          style={{ background: 'var(--bg-base)' }}
        >
          <Loader2
            size={22}
            className="animate-spin"
            style={{ color: 'var(--accent-green)' }}
          />
        </div>
      }
    >
      <IDELoader />
    </Suspense>
  );
}
