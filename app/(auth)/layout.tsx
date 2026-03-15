import ThemeToggle from '@/components/theme/ThemeToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="font-mono font-bold text-2xl tracking-wider"
            style={{ color: 'var(--fg-default)' }}
          >
            ARDUINO<span style={{ color: 'var(--accent-green)' }}>SIM</span>
          </span>
          <p
            className="font-mono text-xs mt-2"
            style={{ color: 'var(--fg-subtle)' }}
          >
            In-browser Arduino IDE · Simulator
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
