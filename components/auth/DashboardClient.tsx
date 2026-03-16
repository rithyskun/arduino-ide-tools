'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Plus,
  Folder,
  Clock,
  Cpu,
  Trash2,
  ExternalLink,
  Search,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useIDEStore } from '@/lib/store';
import { BOARDS } from '@/lib/boards';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog';

interface Project {
  _id: string;
  name: string;
  description?: string;
  boardId: string;
  updatedAt: string;
  createdAt: string;
  fileCount?: number;
  tags: string[];
  isPublic: boolean;
}

export default function DashboardClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const clearUserProjects = useIDEStore((s) => s.clearUserProjects);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    boardId: 'arduino-mega',
  });
  const [createError, setCreateError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects?q=${encodeURIComponent(search)}&sort=updatedAt`
      );
      const data = await res.json();
      if (data.success) setProjects(data.projects);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error);
        return;
      }
      router.push(`/ide?project=${data.project._id}`);
    } catch {
      setCreateError('Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    setPendingDelete({ id, name });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await fetch(`/api/projects/${pendingDelete.id}`, { method: 'DELETE' });
    setProjects((p) => p.filter((x) => x._id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function handleOpen(id: string) {
    router.push(`/ide?project=${id}`);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Top nav */}
      <nav className="h-12 bg-bg-surface border-b border-border-subtle flex items-center px-6 gap-4">
        <span className="font-mono font-bold text-sm text-fg-default">
          ARDUINO<span className="text-accent-green">SIM</span>
        </span>
        <div className="flex-1" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((s) => !s)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-raised
                       font-mono text-xs text-fg-muted transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full bg-green-900/50 border border-green-800
                            flex items-center justify-center text-accent-green font-bold text-[10px]"
            >
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span>{session?.user?.name ?? 'User'}</span>
            <ChevronDown size={12} />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-bg-surface border border-border-default
                            rounded-lg shadow-xl overflow-hidden z-50"
            >
              <div className="px-3 py-2 border-b border-border-subtle">
                <p className="font-mono text-[11px] text-fg-default font-bold truncate">
                  {session?.user?.name}
                </p>
                <p className="font-mono text-[10px] text-fg-subtle truncate">
                  {session?.user?.email}
                </p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-fg-muted hover:bg-bg-raised
                                 font-mono text-xs text-left transition-colors"
              >
                <User size={12} /> Profile
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-fg-muted hover:bg-bg-raised
                                 font-mono text-xs text-left transition-colors"
              >
                <Settings size={12} /> Settings
              </button>
              <div className="border-t border-border-subtle" />
              <button
                onClick={async () => {
                  // Clear user project data from localStorage before signing out
                  // to prevent it leaking into the demo page for the next visitor.
                  clearUserProjects();
                  await signOut({ callbackUrl: '/login' });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-accent-red hover:bg-red-900/20
                           font-mono text-xs text-left transition-colors"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-mono font-bold text-xl text-fg-default">
              My Projects
            </h1>
            <p className="font-mono text-xs text-fg-subtle mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-green-900/40 text-accent-green border border-green-800
                       font-mono text-sm font-bold hover:bg-green-900/60 transition-all"
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 bg-bg-surface border border-border-subtle rounded-lg
                        px-3 py-2 mb-6 focus-within:border-accent-blue transition-colors"
        >
          <Search size={13} className="text-fg-subtle flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent outline-none font-mono text-sm text-fg-default
                       placeholder:text-fg-subtle"
          />
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-fg-subtle">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="font-mono text-sm">Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <Folder size={40} className="text-fg-subtle mx-auto mb-3" />
            <p className="font-mono text-sm text-fg-subtle">
              {search ? `No projects matching "${search}"` : 'No projects yet'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 tb-btn mx-auto"
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const board = BOARDS.find((b) => b.id === p.boardId);
              return (
                <div
                  key={p._id}
                  className="group bg-bg-surface border border-border-subtle rounded-xl p-4
                             hover:border-border-default transition-all cursor-pointer"
                  onClick={() => handleOpen(p._id)}
                >
                  {/* Board icon + name */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {board?.icon ?? '🔧'}
                      </span>
                      <h3 className="font-mono font-bold text-sm text-fg-default truncate">
                        {p.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpen(p._id);
                        }}
                        className="p-1.5 rounded text-fg-subtle hover:text-accent-blue hover:bg-bg-raised"
                        title="Open"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p._id, p.name);
                        }}
                        className="p-1.5 rounded text-fg-subtle hover:text-accent-red hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {p.description && (
                    <p className="font-mono text-[11px] text-fg-subtle mb-3 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {/* Tags */}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] px-1.5 py-0.5 rounded
                                     bg-bg-raised border border-border-subtle text-fg-subtle"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <Cpu size={10} />
                      <span className="font-mono text-[10px]">
                        {board?.mcu ?? p.boardId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <Clock size={10} />
                      <span className="font-mono text-[10px]">
                        {timeAgo(p.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New project modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-bg-surface border border-border-default rounded-xl
                          shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-mono font-bold text-sm text-fg-default">
                New Project
              </h2>
            </div>
            <form onSubmit={handleCreate} className="px-5 py-4 space-y-4">
              {createError && (
                <div
                  className="px-3 py-2 bg-red-900/20 border border-red-800 rounded
                                font-mono text-xs text-accent-red"
                >
                  {createError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-fg-subtle uppercase tracking-wide">
                  Project Name *
                </label>
                <input
                  required
                  autoFocus
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="My Arduino Project"
                  className="w-full bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5
                             font-mono text-sm text-fg-default placeholder:text-fg-subtle
                             outline-none focus:border-accent-blue transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-fg-subtle uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What does this project do?"
                  className="w-full bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5
                             font-mono text-sm text-fg-default placeholder:text-fg-subtle
                             outline-none focus:border-accent-blue transition-colors resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] text-fg-subtle uppercase tracking-wide">
                  Board
                </label>
                <select
                  value={newProject.boardId}
                  onChange={(e) =>
                    setNewProject((p) => ({ ...p, boardId: e.target.value }))
                  }
                  className="w-full bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5
                             font-mono text-sm text-fg-default outline-none focus:border-accent-blue
                             transition-colors"
                >
                  {BOARDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.icon} {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setCreateError('');
                  }}
                  className="flex-1 py-2 rounded-lg border border-border-default
                             font-mono text-sm text-fg-muted hover:bg-bg-raised transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProject.name.trim()}
                  className="flex-1 py-2 rounded-lg bg-green-900/40 text-accent-green
                             border border-green-800 font-mono text-sm font-bold
                             hover:bg-green-900/60 transition-all disabled:opacity-50
                             flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 size={13} className="animate-spin" />}
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Project"
        description={`Delete "${pendingDelete?.name}"? This cannot be undone and all project files will be permanently removed.`}
        confirmLabel="Delete Project"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
