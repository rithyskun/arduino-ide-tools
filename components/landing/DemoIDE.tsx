'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIDEStore } from '@/lib/store';
import {
  DEMO_PROJECT_FILES,
  DEMO_SKETCHES,
  type DemoSketch,
} from '@/lib/defaultFiles';
import {
  Loader2,
  X,
  UserPlus,
  LogIn,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

const IDE = dynamic(() => import('@/components/IDE'), { ssr: false });

const GUEST_KEY = 'arduinosim_guest_project';
const BANNER_KEY = 'arduinosim_banner_dismissed';

function saveGuest(files: typeof DEMO_PROJECT_FILES) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(files));
  } catch {
    /* quota */
  }
}
function loadGuest(): typeof DEMO_PROJECT_FILES | null {
  try {
    const r = localStorage.getItem(GUEST_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

export default function DemoIDE() {
  const router = useRouter();
  const { createProject, projects, activeProjectId, loadSketch } =
    useIDEStore();
  const [ready, setReady] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap guest project on first mount ─────────────────────
  useEffect(() => {
    // SECURITY: Clear any lingering authenticated user projects from the store.
    // This handles the case where a user logs out but the persisted Zustand store
    // still holds their project data (e.g. direct navigation to /demo after logout
    // before the store cleanup in DashboardClient runs).
    const store = useIDEStore.getState();
    const hasUserProjects = store.projects.some((p) => !p.id.startsWith('demo-'));
    if (hasUserProjects) {
      store.clearUserProjects();
    }

    // Now bootstrap the demo project
    const currentProjects = useIDEStore.getState().projects;
    const existingDemo = currentProjects.find((p) => p.id.startsWith('demo-'));
    if (!existingDemo) {
      createProject('Demo Project', 'arduino-mega', true);
      const saved = loadGuest();
      if (saved) {
        const freshStore = useIDEStore.getState();
        const p = freshStore.projects.find((x) => x.id.startsWith('demo-'));
        if (p) {
          freshStore.loadSketch(p.name, p.boardId, saved);
        }
      }
    }
    setBannerDismissed(localStorage.getItem(BANNER_KEY) === '1');
    setReady(true);
  }, []); // eslint-disable-line

  // ── Debounced auto-save to localStorage ────────────────────────
  // Only runs when activeProjectId or files actually change
  const filesRef = useRef<string>('');
  useEffect(() => {
    if (!ready || !activeProjectId) return;
    const project = useIDEStore
      .getState()
      .projects.find((p) => p.id === activeProjectId);
    if (!project?.files) return;

    const snapshot = JSON.stringify(project.files);
    if (snapshot === filesRef.current) return; // nothing changed
    filesRef.current = snapshot;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveGuest(project.files), 2000);
  }, [ready, activeProjectId, projects]); // proper dep array

  function dismissBanner() {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_KEY, '1');
  }

  function handleRegister() {
    // Persist latest work before navigating
    const project = useIDEStore
      .getState()
      .projects.find((p) => p.id === activeProjectId);
    if (project?.files) saveGuest(project.files);
    router.push('/register?from=demo');
  }

  function loadSketchIntoEditor(sketch: DemoSketch) {
    // Use the proper store action — no direct mutation
    loadSketch(sketch.name, sketch.board, sketch.files);
    setShowPicker(false);
  }

  if (!ready)
    return (
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
    );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Guest banner ─────────────────────────────────────────── */}
      {!bannerDismissed && (
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b"
          style={{
            background: 'var(--tint-blue)',
            borderColor: 'var(--border-blue)',
          }}
        >
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--accent-blue)' }}
          >
            ✦ <strong>Guest mode</strong> — code saves locally in this browser.
            Sign up free to save to the cloud and access anywhere.
          </span>
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs transition-all"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              <BookOpen size={11} /> Examples
            </button>
            <button
              onClick={handleRegister}
              className="flex items-center gap-1.5 px-3 py-1 rounded font-mono text-xs font-bold transition-all"
              style={{ background: 'var(--accent-blue)', color: 'white' }}
            >
              <UserPlus size={11} /> Save to account
            </button>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs transition-all"
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              <LogIn size={11} /> Sign in
            </Link>
            <button
              onClick={dismissBanner}
              className="p-1 rounded"
              style={{ color: 'var(--fg-subtle)' }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Sketch picker modal ───────────────────────────────────── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <p
                  className="font-mono font-bold text-sm"
                  style={{ color: 'var(--fg-default)' }}
                >
                  Example Sketches
                </p>
                <p
                  className="font-mono text-[10px] mt-0.5"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  Click any sketch to load it into the editor
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--fg-subtle)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Sketch list */}
            <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
              {DEMO_SKETCHES.map((sketch) => (
                <button
                  key={sketch.id}
                  onClick={() => loadSketchIntoEditor(sketch)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p
                        className="font-mono font-bold text-xs"
                        style={{ color: 'var(--fg-default)' }}
                      >
                        {sketch.name}
                      </p>
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-overlay)',
                          color: 'var(--fg-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {BOARD_LABEL[sketch.board] ?? sketch.board}
                      </span>
                    </div>
                    <p
                      className="font-mono text-[10px] leading-relaxed"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {sketch.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sketch.tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--bg-overlay)',
                            color: 'var(--fg-subtle)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'var(--accent-blue)' }}
                  />
                </button>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 border-t flex items-center justify-between"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-base)',
              }}
            >
              <span
                className="font-mono text-[10px]"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {DEMO_SKETCHES.length} examples · Your current code will be
                replaced
              </span>
              <button
                onClick={handleRegister}
                className="flex items-center gap-1.5 font-mono text-[10px] transition-all"
                style={{ color: 'var(--accent-blue)' }}
              >
                <UserPlus size={10} /> Save to account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full IDE in guest mode ────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <IDE guestMode />
      </div>
    </div>
  );
}

const BOARD_LABEL: Record<string, string> = {
  'arduino-mega': 'MEGA 2560',
  'arduino-uno': 'UNO R3',
  'arduino-nano': 'Nano',
  esp32: 'ESP32',
  esp8266: 'ESP8266',
  rp2040: 'Pico',
};
