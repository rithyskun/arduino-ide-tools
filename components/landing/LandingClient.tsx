'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Cpu,
  Zap,
  Shield,
  GitBranch,
  Terminal,
  ChevronRight,
  Star,
} from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { BOARDS } from '@/lib/boards';

const FEATURES = [
  {
    icon: <Cpu size={18} />,
    title: 'Real Hardware Simulation',
    desc: 'Physics-accurate models for HX711 load cells, INA260 power monitor, NTC thermistors, stepper motors and more — with real noise, drift and quantisation.',
    accent: '--accent-green',
  },
  {
    icon: <Terminal size={18} />,
    title: 'Monaco Code Editor',
    desc: 'The same editor engine as VS Code. Arduino C++ syntax highlighting, bracket matching, autocomplete for Serial, Wire, pinMode and every Arduino keyword.',
    accent: '--accent-blue',
  },
  {
    icon: <Zap size={18} />,
    title: 'I²C Bus Emulator',
    desc: 'Full 128-address I²C bus with per-register handlers. Visual address scanner, PCA9685A mux routing, INA260 register map and DFRobot rainfall I²C protocol.',
    accent: '--accent-amber',
  },
  {
    icon: <GitBranch size={18} />,
    title: 'Multi-file Projects',
    desc: 'Edit .ino, .h and .cpp files in tabs. Import your existing project files, export bundles, or start from a demo sketch on any of 6 supported boards.',
    accent: '--accent-purple',
  },
  {
    icon: <Shield size={18} />,
    title: 'EEPROM & Timer1',
    desc: 'True 4KB EEPROM emulator with magic-byte validation and float persistence. Timer1 ISR fires at correct µs intervals to drive stepper step-pin toggling.',
    accent: '--accent-cyan',
  },
  {
    icon: <Star size={18} />,
    title: 'Save & Sync',
    desc: 'Create a free account to save projects to the cloud, access them anywhere, and pick up exactly where you left off — your guest work transfers automatically.',
    accent: '--accent-red',
  },
];

const SUPPORTED_BOARDS = BOARDS.map((b) => ({
  icon: b.icon,
  name: b.name,
  mcu: b.mcu,
}));

const DEMO_SNIPPETS = [
  {
    label: 'Blink',
    color: '--accent-green',
    code: `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("<Data> LED=ON");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("<Data> LED=OFF");
  delay(500);
}`,
  },
  {
    label: 'HX711 Scale',
    color: '--accent-blue',
    code: `#include "HX711-CUSTOM.h"

HX711 scale;
void setup() {
  scale.begin();
  scale.setScale(-46.5f);
  scale.setZero();
  Serial.begin(9600);
}

void loop() {
  float g = scale.get_units(5);
  Serial.print("<Data> weight=");
  Serial.println(g, 2);
  delay(500);
}`,
  },
  {
    label: 'INA260 Power',
    color: '--accent-amber',
    code: `#include "Adafruit_INA260.h"

Adafruit_INA260 ina260;
void setup() {
  Serial.begin(9600);
  ina260.begin(0x40);
}

void loop() {
  float mA = ina260.readCurrent();
  float mV = ina260.readBusVoltage();
  float mW = ina260.readPower();
  Serial.print("<Data> ");
  Serial.print(mA); Serial.print(",");
  Serial.print(mV); Serial.print(",");
  Serial.println(mW);
  delay(1000);
}`,
  },
];

export default function LandingClient() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--fg-default)' }}
    >
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 border-b flex items-center px-6 h-14"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="font-mono font-bold text-base tracking-wide">
          ARDUINO<span style={{ color: 'var(--accent-green)' }}>SIM</span>
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/demo"
            className="font-mono text-xs px-3 py-1.5 rounded border transition-all"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            Try Demo
          </Link>
          <Link
            href="/login"
            className="font-mono text-xs px-3 py-1.5 rounded border transition-all"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="font-mono text-xs px-4 py-1.5 rounded font-bold transition-all"
            style={{
              background: 'var(--tint-green)',
              color: 'var(--accent-green)',
              border: '1px solid var(--border-green)',
            }}
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6 border"
          style={{
            background: 'var(--tint-green)',
            color: 'var(--accent-green)',
            borderColor: 'var(--border-green)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--accent-green)' }}
          />
          No install · No signup required to try
        </div>

        <h1
          className="font-mono font-bold text-5xl leading-tight mb-4"
          style={{ color: 'var(--fg-default)' }}
        >
          Arduino IDE
          <br />
          <span style={{ color: 'var(--accent-green)' }}>in your browser</span>
        </h1>

        <p
          className="font-sans text-lg max-w-2xl mx-auto mb-10"
          style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}
        >
          Write, simulate and test Arduino firmware without installing anything.
          Physics-accurate sensor models, I²C bus emulation, EEPROM persistence,
          Timer1 interrupts — all running locally in the browser.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/demo"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-mono font-bold text-sm transition-all"
            style={{
              background: 'var(--tint-green)',
              color: 'var(--accent-green)',
              border: '1px solid var(--border-green)',
            }}
          >
            <Play size={14} /> Try the Demo — no account needed
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-mono text-sm transition-all"
            style={{
              background: 'var(--bg-raised)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            Create free account <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Code preview strip ───────────────────────────────── */}
      <section
        className="border-y py-10 overflow-x-auto"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div
          className="flex gap-4 px-6 min-w-max mx-auto"
          style={{ maxWidth: '100vw' }}
        >
          {DEMO_SNIPPETS.map((s) => (
            <div
              key={s.label}
              className="w-72 rounded-xl overflow-hidden flex-shrink-0"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-base)',
              }}
            >
              {/* Tab bar */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--bg-raised)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-red)' }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-amber)' }}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--accent-green)' }}
                />
                <span
                  className="font-mono text-[10px] ml-2"
                  style={{ color: `var(${s.color})` }}
                >
                  {s.label}
                </span>
              </div>
              <pre
                className="p-3 font-mono text-[10px] leading-relaxed overflow-hidden"
                style={{ color: 'var(--fg-muted)', maxHeight: '180px' }}
              >
                <code style={{ color: 'var(--fg-default)' }}>{s.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2
          className="font-mono font-bold text-2xl text-center mb-12"
          style={{ color: 'var(--fg-default)' }}
        >
          Built for serious Arduino development
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border transition-all group"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{
                  background: `var(${f.accent})20`,
                  color: `var(${f.accent})`,
                  border: `1px solid var(${f.accent})40`,
                }}
              >
                {f.icon}
              </div>
              <h3
                className="font-mono font-bold text-sm mb-2"
                style={{ color: 'var(--fg-default)' }}
              >
                {f.title}
              </h3>
              <p
                className="font-sans text-xs leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Supported boards ─────────────────────────────────── */}
      <section
        className="border-t py-14"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="font-mono font-bold text-lg text-center mb-8"
            style={{ color: 'var(--fg-default)' }}
          >
            Supported boards
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {SUPPORTED_BOARDS.map((b) => (
              <div
                key={b.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-xs"
                style={{
                  background: 'var(--bg-raised)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--fg-muted)',
                }}
              >
                <span>{b.icon}</span>
                <span style={{ color: 'var(--fg-default)' }}>{b.name}</span>
                <span style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}>
                  {b.mcu}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2
          className="font-mono font-bold text-3xl mb-4"
          style={{ color: 'var(--fg-default)' }}
        >
          Ready to build something?
        </h2>
        <p
          className="font-sans text-sm mb-8"
          style={{ color: 'var(--fg-muted)' }}
        >
          Try the demo instantly — no account, no install. Create a free account
          when you're ready to save your work.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/demo"
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-mono font-bold text-sm"
            style={{
              background: 'var(--tint-green)',
              color: 'var(--accent-green)',
              border: '1px solid var(--border-green)',
            }}
          >
            <Play size={14} /> Open Demo IDE
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-mono text-sm"
            style={{
              background: 'var(--bg-raised)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            Sign Up Free <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-6 flex items-center justify-between flex-wrap gap-4"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <span
          className="font-mono text-xs font-bold"
          style={{ color: 'var(--fg-subtle)' }}
        >
          ARDUINO<span style={{ color: 'var(--accent-green)' }}>SIM</span>
        </span>
        <div
          className="flex gap-5 font-mono text-xs"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <Link href="/demo" className="hover:underline">
            Demo
          </Link>
          <Link href="/register" className="hover:underline">
            Register
          </Link>
          <Link href="/login" className="hover:underline">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
