'use client';
import { useRef } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Upload,
  Download,
  Plus,
  ChevronDown,
  Cpu,
  Layers,
  Brain,
} from 'lucide-react';
import { useIDEStore } from '@/lib/store';
import { BOARDS } from '@/lib/boards';
import { readFileAsText } from '@/lib/utils';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface ToolbarProps {
  onCompileRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onOpenDevices: () => void;
}

export default function Toolbar({
  onCompileRun,
  onStop,
  onReset,
  onOpenDevices,
}: ToolbarProps) {
  const {
    simStatus,
    simMillis,
    simSpeed,
    simMode,
    activeProjectId,
    projects,
    setSimSpeed,
    setBoardPanelOpen,
    boardPanelOpen,
    importFiles,
    addFile,
  } = useIDEStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = projects.find((p) => p.id === activeProjectId);
  const board = BOARDS.find((b) => b.id === project?.boardId);

  const isRunning = simStatus === 'running';
  const isCompiling = simStatus === 'compiling';
  const isBusy = isRunning || isCompiling;
  const hasResult = simStatus !== 'idle'; // something has been run

  function formatTime(ms: number) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const loaded = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        content: await readFileAsText(f),
      }))
    );
    importFiles(loaded);
    e.target.value = '';
  }

  function handleExport() {
    if (!project) return;
    const lines: string[] = [];
    project.files.forEach((f) => {
      lines.push(`// ===== ${f.name} =====`);
      lines.push(f.content);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Status pill style ────────────────────────────────────────
  const pillStyle: React.CSSProperties = (() => {
    switch (simStatus) {
      case 'compiling':
        return {
          background: 'var(--tint-amber)',
          color: 'var(--accent-amber)',
          border: '1px solid var(--border-amber)',
        };
      case 'running':
        return {
          background: 'var(--tint-green)',
          color: 'var(--accent-green)',
          border: '1px solid var(--border-green)',
        };
      case 'error':
        return {
          background: 'var(--tint-red)',
          color: 'var(--accent-red)',
          border: '1px solid var(--border-red)',
        };
      case 'stopped':
        return {
          background: 'var(--bg-raised)',
          color: 'var(--fg-muted)',
          border: '1px solid var(--border-subtle)',
        };
      default:
        return {
          background: 'var(--bg-raised)',
          color: 'var(--fg-subtle)',
          border: '1px solid var(--border-subtle)',
        };
    }
  })();

  const dotStyle: React.CSSProperties = (() => {
    switch (simStatus) {
      case 'running':
        return {
          background: 'var(--accent-green)',
          boxShadow: '0 0 4px var(--accent-green)',
        };
      case 'compiling':
        return { background: 'var(--accent-amber)' };
      case 'error':
        return { background: 'var(--accent-red)' };
      default:
        return { background: 'var(--fg-subtle)' };
    }
  })();

  return (
    <div
      className="h-11 flex items-center px-3 gap-1.5 flex-shrink-0 z-20 overflow-x-auto"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <span
        className="font-mono font-bold text-xs tracking-wide whitespace-nowrap mr-1"
        style={{ color: 'var(--fg-default)' }}
      >
        ARDUINO<span style={{ color: 'var(--accent-green)' }}>SIM</span>
      </span>

      <Sep />

      {/* Board selector */}
      <Btn onClick={() => setBoardPanelOpen(!boardPanelOpen)}>
        <Cpu size={12} />
        <span className="whitespace-nowrap">
          {board?.icon} {board?.name ?? 'Select Board'}
        </span>
        <ChevronDown size={10} />
      </Btn>

      <Sep />

      {/* ── Compile & Run ─────────────────────────────────────── */}
      <button
        onClick={onCompileRun}
        disabled={isCompiling}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold
                   whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--tint-green)',
          color: 'var(--accent-green)',
          border: '1px solid var(--border-green)',
        }}
        title={
          isBusy
            ? 'Stop current simulation and recompile'
            : 'Compile and run simulation'
        }
      >
        <Play size={12} />
        {isCompiling ? 'Compiling…' : isRunning ? 'Recompile' : 'Compile & Run'}
      </button>

      {/* ── Stop ─────────────────────────────────────────────── */}
      <button
        onClick={onStop}
        disabled={!isBusy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs
                   whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: isBusy ? 'var(--tint-red)' : 'var(--bg-raised)',
          color: isBusy ? 'var(--accent-red)' : 'var(--fg-subtle)',
          border: isBusy
            ? '1px solid var(--border-red)'
            : '1px solid var(--border-subtle)',
        }}
        title="Stop simulation"
      >
        <Square size={12} /> Stop
      </button>

      {/* ── Reset ────────────────────────────────────────────── */}
      <button
        onClick={onReset}
        disabled={!hasResult}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs
                   whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: hasResult ? 'var(--tint-amber)' : 'var(--bg-raised)',
          color: hasResult ? 'var(--accent-amber)' : 'var(--fg-subtle)',
          border: hasResult
            ? '1px solid var(--border-amber)'
            : '1px solid var(--border-subtle)',
        }}
        title="Reset simulation and clear logs"
      >
        <RotateCcw size={12} /> Reset
      </button>

      <Sep />

      {/* ── Smart Simulation Toggle ─────────────────────────────── */}
      <Btn
        onClick={() => {
          // Toggle smart mode - this would integrate with the smart simulator
          const isSmart = simMode === 'smart';
          if (isSmart) {
            // Switch back to interpreted mode
            // setSimMode('interpreted');
          } else {
            // Switch to smart mode
            // setSimMode('smart');
          }
        }}
        title="Enable/disable smart simulation with AI-powered analysis"
      >
        <Brain size={12} />
        <span className="whitespace-nowrap">
          {simMode === 'smart' ? 'Smart ON' : 'Smart OFF'}
        </span>
      </Btn>

      <Sep />

      {/* ── File operations ───────────────────────────────────── */}
      <Btn onClick={() => fileInputRef.current?.click()}>
        <Upload size={12} /> Import
      </Btn>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".ino,.cpp,.c,.h,.hpp,.json,.txt"
        onChange={handleImport}
      />
      <Btn onClick={handleExport}>
        <Download size={12} /> Export
      </Btn>
      <Btn onClick={() => addFile('new_file.h')}>
        <Plus size={12} /> New File
      </Btn>
      <Btn onClick={onOpenDevices} title="Add sensors, motors and peripherals">
        <Layers size={12} /> Devices
      </Btn>

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* ── Theme ─────────────────────────────────────────────── */}
      <ThemeToggle />

      <Sep />

      {/* ── Sim speed ─────────────────────────────────────────── */}
      <span
        className="font-mono text-[10px] whitespace-nowrap"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Speed
      </span>
      <input
        type="range"
        min={1}
        max={10}
        value={simSpeed}
        step={1}
        className="w-16 no-transition"
        style={{ accentColor: 'var(--accent-green)' }}
        onChange={(e) => setSimSpeed(Number(e.target.value))}
      />
      <span
        className="font-mono text-[10px] w-5"
        style={{ color: 'var(--fg-default)' }}
      >
        {simSpeed}×
      </span>

      <Sep />

      {/* ── Sim time ──────────────────────────────────────────── */}
      {isRunning && (
        <span
          className="font-mono text-[10px] whitespace-nowrap"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {formatTime(simMillis)}
          {simMode === 'interpreted' && (
            <span className="ml-1" style={{ color: 'var(--accent-amber)' }}>
              (JS)
            </span>
          )}
          {simMode === 'avr' && (
            <span className="ml-1" style={{ color: 'var(--accent-green)' }}>
              (AVR)
            </span>
          )}
        </span>
      )}

      {/* ── Status pill ───────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium whitespace-nowrap"
        style={pillStyle}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${simStatus === 'running' || simStatus === 'compiling'
            ? 'animate-pulse'
            : ''
            }`}
          style={dotStyle}
        />
        {simStatus.toUpperCase()}
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────
function Sep() {
  return (
    <div
      className="w-px h-5 flex-shrink-0"
      style={{ background: 'var(--border-subtle)' }}
    />
  );
}

function Btn({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-xs
                 whitespace-nowrap transition-all"
      style={{
        background: 'var(--bg-raised)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color =
          'var(--fg-default)';
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--border-emphasis)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--border-default)';
      }}
    >
      {children}
    </button>
  );
}
