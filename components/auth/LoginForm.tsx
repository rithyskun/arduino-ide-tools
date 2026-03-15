'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Cpu } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';

  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        rememberMe: form.rememberMe.toString(),
        redirect: false,
      });

      if (res?.error) {
        // NextAuth swallows the real error message and returns 'CredentialsSignin'
        // when authorize() returns null. Show a friendly message.
        setError('Invalid email or password. Please try again.');
      } else if (res?.ok) {
        const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError('Sign in failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-8 shadow-2xl"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Cpu size={18} className="text-accent-green" />
        <h1 className="font-mono font-bold text-lg text-fg-default">Sign In</h1>
      </div>

      {justRegistered && (
        <div
          className="mb-4 px-3 py-2.5 rounded-lg font-mono text-xs"
          style={{
            backgroundColor: 'var(--tint-green)',
            border: '1px solid var(--border-green)',
            color: 'var(--accent-green)',
          }}
        >
          Account created! Sign in to continue.
        </div>
      )}

      {error && (
        <div
          className="mb-4 px-3 py-2.5 rounded-lg font-mono text-xs"
          style={{
            backgroundColor: 'var(--tint-red)',
            border: '1px solid var(--border-red)',
            color: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            autoFocus
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className={inputCls}
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="••••••••"
              className={inputCls + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-default"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) =>
                setForm((f) => ({ ...f, rememberMe: e.target.checked }))
              }
              className="accent-green-500 w-3.5 h-3.5"
            />
            <span className="font-mono text-xs text-fg-muted">
              Remember me (30 days)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-green-900/40 text-accent-green border border-green-800
                     font-mono text-sm font-bold hover:bg-green-900/60 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-xs text-fg-subtle">
        No account?{' '}
        <Link href="/register" className="text-accent-blue hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[11px] text-fg-subtle uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = `
  w-full bg-bg-raised border border-border-subtle rounded-lg px-3 py-2.5
  font-mono text-sm text-fg-default placeholder:text-fg-subtle
  outline-none focus:border-accent-blue transition-colors
`.trim();
