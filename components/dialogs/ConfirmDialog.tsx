'use client';
import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  dangerous = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-bg-surface border border-border-default rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            {dangerous && <AlertTriangle size={14} className="text-accent-red flex-shrink-0" />}
            <h2 className="font-mono font-bold text-sm text-fg-default">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-fg-subtle hover:text-fg-default hover:bg-bg-raised transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="font-mono text-xs text-fg-muted leading-relaxed">{description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-border-default
                       font-mono text-sm text-fg-muted hover:bg-bg-raised transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              dangerous
                ? 'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-sm font-bold transition-all bg-red-900/40 text-accent-red border border-red-800 hover:bg-red-900/60'
                : 'flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-all bg-bg-raised text-fg-default border border-border-default hover:bg-bg-surface'
            }
          >
            {dangerous && <Trash2 size={12} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
