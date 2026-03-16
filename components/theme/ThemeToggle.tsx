'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Position dropdown relative to the button using fixed coords ──────────
  // This avoids stacking context / overflow clipping issues entirely —
  // the dropdown is rendered in a portal at the document root with fixed
  // positioning calculated from the button's bounding rect.
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      // Align right edge of dropdown to right edge of button
      right: window.innerWidth - rect.right,
      zIndex: 9999,
      width: 144, // w-36
    });
  }, []);

  function toggle() {
    if (!open) updatePosition();
    setOpen((o) => !o);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Reposition on scroll or resize in case button moved
  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, updatePosition]);

  function select(t: Theme) {
    setTheme(t);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.value === theme)!;

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="
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
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="tb-btn gap-1.5"
        title={`Theme: ${current.label}`}
        aria-label="Toggle theme"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {ICONS[theme]}
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Render dropdown in a portal to escape any parent stacking context */}
      {typeof document !== 'undefined' &&
        dropdown &&
        createPortal(dropdown, document.body)}
    </>
  );
}
