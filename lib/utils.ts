import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function nanoid(len = 8): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

export function formatMillis(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((ms % 3_600_000) / 60_000)
    .toString()
    .padStart(2, '0');
  const s = Math.floor((ms % 60_000) / 1_000)
    .toString()
    .padStart(2, '0');
  const ms3 = (ms % 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms3}`;
}

export function langForFile(name: string): 'cpp' | 'json' | 'plaintext' {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['h', 'hpp', 'cpp', 'c', 'ino'].includes(ext)) return 'cpp';
  if (ext === 'json') return 'json';
  return 'plaintext';
}

export function iconForFile(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ino') return '⚡';
  if (ext === 'h' || ext === 'hpp') return '📄';
  if (ext === 'cpp' || ext === 'c') return '📝';
  if (ext === 'json') return '📋';
  return '📃';
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
