'use client';
import { useEffect, useRef, useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { useIDEStore } from '@/lib/store';
import type { SerialLineType } from '@/types';
import { formatMillis } from '@/lib/utils';

interface SerialMonitorProps {
  onSend: (cmd: string) => void;
}

export default function SerialMonitor({ onSend }: SerialMonitorProps) {
  const { serialLines, clearSerial, simStatus } = useIDEStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [serialLines.length]);

  function handleSend() {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((h) => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    onSend(cmd);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSend();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx < 0 ? '' : (history[idx] ?? ''));
    }
  }

  const lineClass: Record<SerialLineType, string> = {
    inf: 'sl-inf',
    err: 'sl-err',
    data: 'sl-data',
    raw: 'sl-raw',
    cmd: 'sl-cmd',
    sys: 'sl-sys',
  };

  const isActive = simStatus === 'running';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="panel-hdr">
        <span>Serial Monitor</span>
        <span className="text-[9px] text-fg-subtle">9600 baud</span>
        <span className="text-[9px] text-fg-subtle ml-auto">
          {serialLines.length} lines
        </span>
        <button
          className="text-fg-subtle hover:text-fg-default transition-colors"
          onClick={clearSerial}
          title="Clear"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 font-mono text-[11px] leading-relaxed min-h-0 bg-bg-base">
        {serialLines.map((line) => (
          <div key={line.id} className={`flex gap-1.5 ${lineClass[line.type]}`}>
            <span className="text-fg-subtle text-[9px] flex-shrink-0 mt-px select-none">
              [{formatMillis(line.timestamp)}]
            </span>
            <span className="break-all">{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex border-t border-border-subtle flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isActive}
          placeholder={
            isActive
              ? 'SS:120 | Tare | SetScale:0:-46.5 | Relay1_ON …'
              : 'Run simulation to send commands'
          }
          className="flex-1 bg-bg-surface border-none outline-none px-2.5 py-2
                     font-mono text-[11px] text-fg-default placeholder:text-fg-subtle
                     disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!isActive || !input.trim()}
          className="border-l border-border-subtle px-3 text-accent-blue
                     hover:bg-bg-raised disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-1"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  );
}
