'use client';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Cpu, Check, X } from 'lucide-react';

interface FieldError {
  [key: string]: string[];
}

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDemo = searchParams.get('from') === 'demo';

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    displayName: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});

  // Password strength rules
  const rules = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'One number', ok: /[0-9]/.test(form.password) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setFieldErrors(data.errors);
        else setError(data.error ?? 'Registration failed');
        return;
      }
      // Auto sign-in after successful registration
      const signInRes = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInRes?.error) {
        router.push('/login?registered=1');
      } else {
        // Import guest work if coming from demo
        if (fromDemo) {
          try {
            const guestFiles = localStorage.getItem('arduinosim_guest_project');
            if (guestFiles && data.user) {
              // Fetch the newly created project and update its files
              const projectsRes = await fetch('/api/projects');
              const projectsData = await projectsRes.json();
              const firstProject = projectsData.projects?.[0];
              if (firstProject) {
                const files = JSON.parse(guestFiles);
                await fetch('/api/projects/' + firstProject._id, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ files, name: 'My Demo Project' }),
                });
                localStorage.removeItem('arduinosim_guest_project');
                localStorage.removeItem('arduinosim_banner_dismissed');
              }
            }
          } catch {
            /* best effort */
          }
        }
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fe(field: string) {
    return fieldErrors[field]?.[0];
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
        <h1 className="font-mono font-bold text-lg text-fg-default">
          Create Account
        </h1>
      </div>

      {fromDemo && !error && (
        <div
          className="mb-4 px-3 py-2.5 rounded-lg font-mono text-xs"
          style={{
            background: 'var(--tint-blue)',
            border: '1px solid var(--border-blue)',
            color: 'var(--accent-blue)',
          }}
        >
          💾 Your demo work will be saved to your new account automatically.
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" error={fe('email')} className="col-span-2">
            <input
              type="email"
              required
              autoFocus
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="you@example.com"
              className={inputCls(!!fe('email'))}
            />
          </Field>

          <Field label="Username" error={fe('username')}>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="rithy_dev"
              className={inputCls(!!fe('username'))}
            />
          </Field>

          <Field label="Display Name" error={fe('displayName')}>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
              placeholder="Rithy Skun"
              className={inputCls(!!fe('displayName'))}
            />
          </Field>
        </div>

        <Field label="Password" error={fe('password')}>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="••••••••"
              className={inputCls(!!fe('password')) + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-default"
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {/* Strength indicator */}
          {form.password && (
            <div className="mt-2 space-y-1">
              {rules.map((r) => (
                <div key={r.label} className="flex items-center gap-1.5">
                  {r.ok ? (
                    <Check
                      size={10}
                      className="text-accent-green flex-shrink-0"
                    />
                  ) : (
                    <X size={10} className="text-fg-subtle flex-shrink-0" />
                  )}
                  <span
                    className={`font-mono text-[10px] ${r.ok ? 'text-accent-green' : 'text-fg-subtle'}`}
                  >
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Field>

        <button
          type="submit"
          disabled={loading || rules.some((r) => !r.ok)}
          className="w-full py-2.5 rounded-lg bg-green-900/40 text-accent-green border border-green-800
                     font-mono text-sm font-bold hover:bg-green-900/60 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center font-mono text-xs text-fg-subtle">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="font-mono text-[11px] text-fg-subtle uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && (
        <p className="font-mono text-[10px] text-accent-red">{error}</p>
      )}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `
    w-full bg-bg-raised border rounded-lg px-3 py-2.5
    font-mono text-sm text-fg-default placeholder:text-fg-subtle
    outline-none transition-colors
    ${hasError ? 'border-accent-red focus:border-accent-red' : 'border-border-subtle focus:border-accent-blue'}
  `.trim();
}
