'use client';
import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useIDEStore } from '@/lib/store';

export default function CompileLog() {
  const { compileLog, clearLog } = useIDEStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [compileLog.length]);

  const levelClass: Record<string, string> = {
    step: 'cl-step',
    ok: 'cl-ok',
    warn: 'cl-warn',
    error: 'cl-error',
    info: 'cl-info',
  };

  const errCount = compileLog.filter((l) => l.level === 'error').length;
  const warnCount = compileLog.filter((l) => l.level === 'warn').length;

  return (
    <div className="flex flex-col h-full min-h-0 border-t border-border-subtle">
      {/* Header */}
      <div className="panel-hdr">
        <span>Compile Log</span>
        {compileLog.length > 0 && (
          <span className="text-[9px] text-fg-subtle">
            {errCount > 0 && (
              <span className="text-accent-red mr-1">{errCount} errors</span>
            )}
            {warnCount > 0 && (
              <span className="text-accent-amber">{warnCount} warnings</span>
            )}
          </span>
        )}
        <button
          className="ml-auto text-fg-subtle hover:text-fg-default transition-colors"
          onClick={clearLog}
          title="Clear"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[11px] leading-relaxed min-h-0">
        {compileLog.length === 0 ? (
          <p className="text-fg-subtle">
            Click ▶ Compile &amp; Run to build the project.
          </p>
        ) : (
          compileLog.map((line) => (
            <div key={line.id} className={levelClass[line.level] ?? 'cl-info'}>
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
