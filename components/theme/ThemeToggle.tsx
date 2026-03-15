'use client';
import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { THEMES, type Theme } from '@/lib/theme';

const ICONS = {
  light: <Sun size={13} />,
  dark: <Moon size={13} />,
  system: <Monitor size={13} />,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function select(t: Theme) {
    setTheme(t);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.value === theme)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tb-btn gap-1.5"
        title={`Theme: ${current.label}`}
        aria-label="Toggle theme"
      >
        {ICONS[theme]}
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="
            absolute right-0 top-full mt-1 z-50 w-36
            bg-[var(--bg-surface)] border border-[var(--border-subtle)]
            rounded-lg shadow-xl overflow-hidden
          "
        >
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => select(t.value)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2
                font-mono text-xs transition-colors text-left
                ${
                  theme === t.value
                    ? 'bg-[var(--bg-raised)] text-[var(--accent-green)]'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--bg-raised)] hover:text-[var(--fg-default)]'
                }
              `}
            >
              <span className="flex-shrink-0">{ICONS[t.value]}</span>
              <span>{t.label}</span>
              {theme === t.value && (
                <span className="ml-auto text-[var(--accent-green)] text-[10px]">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
