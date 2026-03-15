import type { Metadata } from 'next';
import Providers from '@/components/auth/Providers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArduinoSim · IDE & Simulator',
  description:
    'In-browser Arduino IDE with AVR simulation, MongoDB-backed projects and user accounts',
};

// Inline script that runs before React hydration to prevent theme flash.
// Reads localStorage and immediately sets data-theme on <html>.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('arduinosim-theme') || 'system';
    var resolved = t;
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.toggle('dark',  resolved === 'dark');
    document.documentElement.classList.toggle('light', resolved === 'light');
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('light');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Don't set theme classes on server - let client script handle it
  // This prevents hydration mismatch
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Run before page paint — prevents white flash on dark theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="h-full overflow-hidden font-sans"
        style={{
          backgroundColor: 'var(--bg-base)',
          color: 'var(--fg-default)',
        }}
      >
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
