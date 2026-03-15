'use client';
import { useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { DEVICES } from '@/lib/devices';
import { useIDEStore } from '@/lib/store';
import type { DeviceCategory } from '@/types';

const CATEGORIES: { id: DeviceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sensor', label: 'Sensors' },
  { id: 'power', label: 'Power' },
  { id: 'motor', label: 'Motors' },
  { id: 'display', label: 'Displays' },
  { id: 'communication', label: 'Comms' },
  { id: 'input', label: 'Input / Output' },
  { id: 'storage', label: 'Storage' },
];

interface DeviceCatalogProps {
  open: boolean;
  onClose: () => void;
}

export default function DeviceCatalog({ open, onClose }: DeviceCatalogProps) {
  const { addDevice } = useIDEStore();
  const [cat, setCat] = useState<DeviceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (!open) return null;

  const filtered = DEVICES.filter((d) => {
    const matchCat = cat === 'all' || d.category === cat;
    const matchQ =
      !query ||
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  function handleAdd(deviceId: string, name: string) {
    const count = [...added].filter((id) => id.startsWith(deviceId)).length;
    addDevice(deviceId, `${name}${count > 0 ? ` ${count + 1}` : ''}`);
    setAdded((prev) => new Set([...prev, deviceId + '_' + Date.now()]));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-[700px] max-h-[78vh] flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span
            className="font-mono font-bold text-sm"
            style={{ color: 'var(--fg-default)' }}
          >
            Add Device / Peripheral
          </span>
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded ml-1"
            style={{
              background: 'var(--bg-raised)',
              color: 'var(--fg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {DEVICES.length} available
          </span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded transition-colors"
            style={{ color: 'var(--fg-subtle)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--fg-default)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--fg-subtle)')
            }
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        <div
          className="px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Search
              size={12}
              style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description…"
              className="flex-1 bg-transparent outline-none font-mono text-xs"
              style={{ color: 'var(--fg-default)' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ color: 'var(--fg-subtle)' }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* ── Category sidebar ─────────────────────────────────── */}
          <div
            className="w-36 py-1 flex-shrink-0 overflow-y-auto"
            style={{ borderRight: '1px solid var(--border-subtle)' }}
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="w-full text-left px-3 py-1.5 font-mono text-[11px] transition-colors"
                style={{
                  background: cat === c.id ? 'var(--bg-raised)' : 'transparent',
                  color:
                    cat === c.id ? 'var(--accent-blue)' : 'var(--fg-muted)',
                  borderLeft:
                    cat === c.id
                      ? '2px solid var(--accent-blue)'
                      : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (cat !== c.id)
                    e.currentTarget.style.color = 'var(--fg-default)';
                }}
                onMouseLeave={(e) => {
                  if (cat !== c.id)
                    e.currentTarget.style.color = 'var(--fg-muted)';
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* ── Device grid ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {filtered.map((device) => (
              <div
                key={device.id}
                className="rounded-lg p-3 group transition-all"
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--border-default)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--border-subtle)')
                }
              >
                {/* Name + Add row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{device.icon}</span>
                    <div className="min-w-0">
                      <p
                        className="font-mono text-xs font-bold leading-tight truncate"
                        style={{ color: 'var(--fg-default)' }}
                      >
                        {device.name}
                      </p>
                      <p
                        className="font-mono text-[9px] mt-0.5 truncate"
                        style={{ color: 'var(--accent-blue)' }}
                      >
                        {device.library || 'built-in'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(device.id, device.name)}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] transition-all"
                    style={{
                      background: 'var(--tint-green)',
                      color: 'var(--accent-green)',
                      border: '1px solid var(--border-green)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.filter = 'brightness(1.15)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.filter = 'none')
                    }
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>

                {/* Description */}
                <p
                  className="font-mono text-[10px] mt-2 leading-relaxed line-clamp-2"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {device.description}
                </p>

                {/* Required pins */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {device.pins
                    .filter((p) => p.required)
                    .map((p) => (
                      <span
                        key={p.name}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-overlay)',
                          color: 'var(--fg-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {p.name}
                      </span>
                    ))}
                </div>

                {/* Stub code — shown on hover */}
                {device.stubCode && (
                  <pre
                    className="hidden group-hover:block mt-2 text-[9px] rounded p-2 overflow-x-auto font-mono leading-relaxed max-h-24"
                    style={{
                      background: 'var(--bg-base)',
                      color: 'var(--accent-green)',
                    }}
                  >
                    {device.stubCode}
                  </pre>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center py-12 gap-2">
                <span className="text-2xl">🔍</span>
                <p
                  className="font-mono text-xs"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  No devices match &quot;{query}&quot;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div
          className="px-4 py-2.5 flex-shrink-0 flex items-center justify-between"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {filtered.length} device{filtered.length !== 1 ? 's' : ''} shown
            {added.size > 0 && (
              <span style={{ color: 'var(--accent-green)' }}>
                {' '}
                · {added.size} added this session
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-xs px-3 py-1.5 rounded transition-all"
            style={{
              background: 'var(--bg-raised)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--fg-default)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--fg-muted)')
            }
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
