'use client';
import { useState } from 'react';
import { Cpu, Activity, Grid3x3 } from 'lucide-react';
import BoardVisualizer from './BoardVisualizer';
import { useIDEStore } from '@/lib/store';
import { BOARDS } from '@/lib/boards';
import type { DiagnosticSnapshot } from '@/lib/simulator/smart-engine';

interface SimulationPanelProps {
  pinStates: Record<number, number>;
  analogStates: Record<number, number>;
  diagnostics: DiagnosticSnapshot | null;
  simRunning: boolean;
  simMillis: number;
}

export default function SimulationPanel({
  pinStates,
  analogStates,
  diagnostics,
  simRunning,
  simMillis,
}: SimulationPanelProps) {
  const { activeProjectId, projects } = useIDEStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const board = BOARDS.find((b) => b.id === project?.boardId) ?? BOARDS[0];

  const [view, setView] = useState<'board' | 'pins' | 'stats'>('board');

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Sub-tabs */}
      <div
        className="flex flex-shrink-0 border-b"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        {(
          [
            { id: 'board', icon: <Cpu size={10} />, label: 'Board' },
            { id: 'pins', icon: <Grid3x3 size={10} />, label: 'Pins' },
            { id: 'stats', icon: <Activity size={10} />, label: 'Stats' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors"
            style={{
              color: view === t.id ? 'var(--accent-blue)' : 'var(--fg-subtle)',
              borderBottom:
                view === t.id
                  ? '2px solid var(--accent-blue)'
                  : '2px solid transparent',
              background: view === t.id ? 'var(--bg-base)' : 'transparent',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Board name header */}
          <div
            className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{board.icon}</span>
              <span
                className="font-mono text-xs font-bold"
                style={{ color: 'var(--fg-default)' }}
              >
                {board.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {simRunning && (
                <span
                  className="flex items-center gap-1 font-mono text-[9px]"
                  style={{ color: 'var(--accent-green)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: 'var(--accent-green)' }}
                  />
                  RUNNING
                </span>
              )}
              <span
                className="font-mono text-[9px]"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {board.mcu} · {(board.fcpu / 1_000_000).toFixed(0)}MHz
              </span>
            </div>
          </div>

          {/* SVG board */}
          <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
            <div className="w-full h-full max-w-full max-h-full">
              <BoardVisualizer
                board={board}
                pinStates={pinStates}
                analogStates={analogStates}
                simRunning={simRunning}
                simMillis={simMillis}
              />
            </div>
          </div>

          {/* LED legend */}
          <div
            className="flex items-center justify-center gap-4 px-3 py-2 flex-shrink-0"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            {[
              { color: '#22c55e', label: 'Digital HIGH' },
              { color: '#a855f7', label: 'Analog HIGH' },
              { color: '#3b82f6', label: 'TX / RX' },
              { color: '#f97316', label: 'Built-in LED' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span
                  className="font-mono text-[9px]"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pins view */}
      {view === 'pins' && (
        <div className="flex-1 overflow-y-auto">
          <PinTable
            board={board}
            pinStates={pinStates}
            analogStates={analogStates}
          />
        </div>
      )}

      {/* Stats view */}
      {view === 'stats' && (
        <div className="flex-1 overflow-y-auto">
          <StatsView
            board={board}
            diagnostics={diagnostics}
            simMillis={simMillis}
            simRunning={simRunning}
          />
        </div>
      )}
    </div>
  );
}

// ── Pin table ─────────────────────────────────────────────────────
import type { Board } from '@/types';

function PinTable({
  board,
  pinStates,
  analogStates,
}: {
  board: Board;
  pinStates: Record<number, number>;
  analogStates: Record<number, number>;
}) {
  const highPins = board.pins.filter((p) => (pinStates[p.number] ?? 0) === 1);

  return (
    <div>
      {/* Summary row */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {board.pins.length} pins total
        </span>
        <span
          className="font-mono text-[10px]"
          style={{ color: 'var(--accent-green)' }}
        >
          {highPins.length} HIGH
        </span>
      </div>

      {/* Pin rows — only show active or special pins to keep it clean */}
      {board.pins.map((pin) => {
        const val = pinStates[pin.number] ?? 0;
        const aVal = analogStates[pin.number];
        const isAnalog = board.analogPins.includes(pin.number);
        const isPWM =
          board.id === 'arduino-mega'
            ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(pin.number)
            : [3, 5, 6, 9, 10, 11].includes(pin.number);
        const isI2C = board.i2cPins.some(
          (p) => p.sda === pin.number || p.scl === pin.number
        );
        const isSPI = board.spiPins.some((p) =>
          [p.mosi, p.miso, p.sck, p.ss].includes(pin.number)
        );
        const isUART = board.uartPins.some(
          (p) => p.tx === pin.number || p.rx === pin.number
        );
        const isLED = board.builtinLed === pin.number;

        const color = isAnalog
          ? 'var(--accent-purple)'
          : isI2C
            ? 'var(--accent-amber)'
            : isUART
              ? 'var(--accent-blue)'
              : 'var(--accent-green)';

        return (
          <div
            key={pin.number}
            className="flex items-center px-3 py-1 border-b"
            style={{
              borderColor: 'var(--border-subtle)',
              background: val ? color + '10' : 'transparent',
            }}
          >
            {/* State dot */}
            <div
              className="w-2 h-2 rounded-full mr-2 flex-shrink-0 transition-all"
              style={{
                background: val ? color : 'transparent',
                border: `1px solid ${val ? color : 'var(--border-default)'}`,
                boxShadow: val ? `0 0 4px ${color}` : 'none',
              }}
            />

            {/* Pin number */}
            <span
              className="font-mono text-[10px] w-8 flex-shrink-0"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {pin.label}
            </span>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {isPWM && <Tag label="PWM" color="var(--accent-amber)" />}
              {isI2C && <Tag label="I2C" color="var(--accent-amber)" />}
              {isSPI && <Tag label="SPI" color="var(--accent-purple)" />}
              {isUART && <Tag label="UART" color="var(--accent-blue)" />}
              {isLED && <Tag label="LED" color="var(--accent-green)" />}
              {isAnalog && <Tag label="ADC" color="var(--accent-purple)" />}
            </div>

            {/* Value */}
            <span
              className="font-mono text-[10px] font-bold ml-auto"
              style={{ color: val ? color : 'var(--fg-subtle)' }}
            >
              {isAnalog && aVal !== undefined ? aVal : val ? 'HIGH' : 'LOW'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="font-mono text-[8px] px-1 py-0.5 rounded"
      style={{
        background: color + '20',
        color,
        border: `1px solid ${color}50`,
      }}
    >
      {label}
    </span>
  );
}

// ── Stats view ────────────────────────────────────────────────────
function StatsView({
  board,
  diagnostics,
  simMillis,
  simRunning,
}: {
  board: Board;
  diagnostics: DiagnosticSnapshot | null;
  simMillis: number;
  simRunning: boolean;
}) {
  const rows: [string, string, string][] = [
    ['MCU', board.mcu, 'var(--fg-default)'],
    ['Clock', `${(board.fcpu / 1_000_000).toFixed(0)} MHz`, 'var(--fg-muted)'],
    ['Flash', `${board.flashKB} KB`, 'var(--fg-muted)'],
    ['SRAM', `${board.ramKB} KB`, 'var(--fg-muted)'],
    [
      'EEPROM',
      board.eepromKB > 0 ? `${board.eepromKB} KB` : 'none',
      'var(--fg-muted)',
    ],
    [
      'Sim time',
      simMillis > 0 ? `${(simMillis / 1000).toFixed(2)}s` : '—',
      'var(--fg-default)',
    ],
    [
      'Status',
      simRunning ? 'RUNNING' : 'IDLE',
      simRunning ? 'var(--accent-green)' : 'var(--fg-subtle)',
    ],
    [
      'I2C devices',
      diagnostics ? `${diagnostics.i2cBus.length}` : '—',
      'var(--fg-muted)',
    ],
    [
      'EEPROM',
      diagnostics?.eepromMagic ? 'Valid (0xA55A)' : diagnostics ? 'Empty' : '—',
      diagnostics?.eepromMagic ? 'var(--accent-green)' : 'var(--fg-subtle)',
    ],
    [
      'Motor',
      diagnostics?.motorRunning ? `${diagnostics.motorRpm} RPM` : 'STOPPED',
      diagnostics?.motorRunning ? 'var(--accent-green)' : 'var(--fg-subtle)',
    ],
    [
      'Flow rate',
      diagnostics ? `${diagnostics.stepper.flowRateL_h.toFixed(3)} L/h` : '—',
      'var(--fg-muted)',
    ],
    [
      'INA voltage',
      diagnostics ? `${diagnostics.ina260.busVoltage.toFixed(1)} mV` : '—',
      'var(--accent-amber)',
    ],
    [
      'INA current',
      diagnostics ? `${diagnostics.ina260.current.toFixed(1)} mA` : '—',
      'var(--accent-blue)',
    ],
    [
      'INA power',
      diagnostics ? `${diagnostics.ina260.power.toFixed(0)} mW` : '—',
      'var(--accent-red)',
    ],
    ...(diagnostics?.rain.map((r, i): [string, string, string] => [
      `Rain ${i}`,
      `${r.rawTips} tips · ${r.rainfall.toFixed(2)} mm`,
      'var(--accent-cyan)',
    ]) ?? []),
    ...(diagnostics?.hx711.map((h, i): [string, string, string] => [
      `Scale ${i}`,
      `${Math.round((h.rawAdc - h.offset) / (h.scaleFactor || 1))} g`,
      'var(--fg-muted)',
    ]) ?? []),
  ];

  return (
    <div>
      {rows.map(([label, value, color]) => (
        <div
          key={label}
          className="flex items-center justify-between px-3 py-1.5 border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {label}
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
