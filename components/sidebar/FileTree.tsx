'use client';
import { useState, useRef } from 'react';
import { FilePlus, Trash2, Download } from 'lucide-react';
import { useIDEStore } from '@/lib/store';
import { iconForFile, downloadText } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/dialogs/ConfirmDialog';

export default function FileTree() {
  const {
    activeProjectId,
    projects,
    activeFile,
    openFile,
    deleteFile,
    addFile,
  } = useIDEStore();

  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const project = projects.find((p) => p.id === activeProjectId);
  const files = project?.files.filter((f) => !f.name.startsWith('__')) ?? [];

  function handleCreate() {
    const n = newName.trim();
    if (!n) {
      setShowInput(false);
      return;
    }
    addFile(n);
    setNewName('');
    setShowInput(false);
  }

  function handleDelete(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPendingDelete(name);
  }

  function handleDownload(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    const f = project?.files.find((x) => x.name === name);
    if (f) downloadText(f.name, f.content);
  }

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header */}
      <div className="panel-hdr justify-between">
        <span>Explorer</span>
        <button
          className="text-fg-subtle hover:text-accent-blue transition-colors"
          onClick={() => {
            setShowInput(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          title="New file"
        >
          <FilePlus size={12} />
        </button>
      </div>

      {/* Project name */}
      {project && (
        <div className="px-3 py-1.5 border-b border-border-subtle">
          <span className="font-mono text-[10px] text-fg-subtle uppercase tracking-wide">
            Project
          </span>
          <p className="font-mono text-xs text-fg-default truncate mt-0.5">
            {project.name}
          </p>
          <p className="font-mono text-[9px] text-fg-subtle">
            {BOARD_LABELS[project.boardId] ?? project.boardId}
          </p>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((f) => (
          <div
            key={f.name}
            onClick={() => openFile(f.name)}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1 cursor-pointer',
              'font-mono text-[11px] border-l-2 transition-all',
              activeFile === f.name
                ? 'bg-bg-raised text-fg-default border-accent-blue'
                : 'text-fg-muted border-transparent hover:bg-bg-raised hover:text-fg-default',
              f.modified && 'text-accent-amber'
            )}
          >
            <span className="text-[10px] opacity-50 flex-shrink-0">
              {iconForFile(f.name)}
            </span>
            <span className="flex-1 truncate">{f.name}</span>
            {f.modified && (
              <span className="text-accent-amber text-[8px]">●</span>
            )}
            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
              <button
                className="p-0.5 rounded text-fg-subtle hover:text-accent-blue"
                onClick={(e) => handleDownload(f.name, e)}
                title="Download"
              >
                <Download size={9} />
              </button>
              {!f.readonly && (
                <button
                  className="p-0.5 rounded text-fg-subtle hover:text-accent-red"
                  onClick={(e) => handleDelete(f.name, e)}
                  title="Delete"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New file input */}
      {showInput && (
        <div className="px-2 py-1.5 border-t border-border-subtle">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowInput(false);
                setNewName('');
              }
            }}
            onBlur={handleCreate}
            placeholder="filename.h"
            className="w-full bg-bg-raised border border-border-default rounded px-2 py-1
                       font-mono text-[11px] text-fg-default outline-none
                       focus:border-accent-blue"
          />
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete File"
        description={`Delete "${pendingDelete}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteFile(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

const BOARD_LABELS: Record<string, string> = {
  'arduino-mega': 'Arduino MEGA 2560',
  'arduino-uno': 'Arduino UNO R3',
  'arduino-nano': 'Arduino Nano',
  esp32: 'ESP32 DevKit',
  esp8266: 'ESP8266 NodeMCU',
  rp2040: 'Raspberry Pi Pico',
};
