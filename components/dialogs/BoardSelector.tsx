'use client';
import { X, Check } from 'lucide-react';
import { BOARDS } from '@/lib/boards';
import { useIDEStore } from '@/lib/store';

interface BoardSelectorProps {
  open: boolean;
  onClose: () => void;
}

export default function BoardSelector({ open, onClose }: BoardSelectorProps) {
  const { activeProjectId, projects, setBoard } = useIDEStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const currentBoardId = project?.boardId ?? 'arduino-mega';

  if (!open) return null;

  function handleSelect(id: string) {
    setBoard(id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60">
      <div
        className="w-[520px] bg-bg-surface border border-border-default rounded-xl
                      flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <span className="font-mono font-bold text-sm text-fg-default">
            Select Board
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-fg-subtle hover:text-fg-default"
          >
            <X size={16} />
          </button>
        </div>

        {/* Board list */}
        <div className="p-3 flex flex-col gap-2 max-h-[65vh] overflow-y-auto">
          {BOARDS.map((board) => {
            const active = board.id === currentBoardId;
            return (
              <div
                key={board.id}
                onClick={() => handleSelect(board.id)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  active
                    ? 'bg-green-900/20 border-green-800 ring-1 ring-accent-green/30'
                    : 'bg-bg-raised border-border-subtle hover:border-border-default'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{board.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-fg-default">
                      {board.name}
                    </p>
                    {active && (
                      <Check size={12} className="text-accent-green" />
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-fg-subtle mt-0.5">
                    {board.mcu}
                  </p>

                  {/* Specs row */}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {[
                      { label: 'Flash', val: board.flashKB + 'KB' },
                      { label: 'RAM', val: board.ramKB + 'KB' },
                      {
                        label: 'Speed',
                        val: (board.fcpu / 1e6).toFixed(0) + ' MHz',
                      },
                      {
                        label: 'Digital',
                        val: board.pins
                          .filter((p) => p.type === 'digital')
                          .length.toString(),
                      },
                      {
                        label: 'Analog',
                        val: board.analogPins.length.toString(),
                      },
                      { label: 'I2C', val: board.i2cPins.length.toString() },
                    ].map(({ label, val }) => (
                      <span
                        key={label}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded
                                                    bg-bg-overlay border border-border-subtle text-fg-subtle"
                      >
                        {label}: <span className="text-fg-default">{val}</span>
                      </span>
                    ))}
                  </div>

                  {/* Pin highlights */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {board.uartPins.map((u, i) => (
                      <span
                        key={i}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded
                                               bg-blue-900/30 border border-blue-800 text-accent-blue"
                      >
                        UART TX:{u.tx}/RX:{u.rx}
                      </span>
                    ))}
                    {board.i2cPins.map((u, i) => (
                      <span
                        key={i}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded
                                               bg-amber-900/20 border border-amber-800 text-accent-amber"
                      >
                        I2C SDA:{u.sda}/SCL:{u.scl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-border-subtle text-[10px] text-fg-subtle font-mono">
          Changing the board updates MCU settings. Existing code is preserved.
        </div>
      </div>
    </div>
  );
}
