/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = [
  "default-src 'self';",
  // unsafe-inline: themeScript inline block + NextAuth inline scripts
  // unsafe-eval: Monaco Editor web workers
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;",
  "worker-src 'self' blob:;",
  // ws:/wss: for HMR in dev; godbolt for compilation API
  "connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://godbolt.org;",
  "img-src 'self' data: https:;",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;",
  "frame-ancestors 'none';",
  "base-uri 'self';",
  "form-action 'self';",
  "manifest-src 'self';",
].join(' ');

const nextConfig = {
  turbopack: {},

  async headers() {
    return [
      {
        source: '/((?!api/).*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          // FIX: Added missing security headers that were only in the review doc
          // but not actually applied. next.config.js is the right place for these
          // (vercel.json headers only apply on Vercel; next.config.js applies everywhere).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Mongoose uses Node.js-only modules — exclude from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        crypto: false,
      };
    }
    return config;
  },

  // FIX: Replaced wildcard hostname '**' with explicit allowed hosts.
  // A wildcard allows your <Image> component to proxy ANY external URL,
  // which can be abused as an open image proxy. Add hosts you actually need.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Add other trusted image hosts here as needed
    ],
  },

  poweredByHeader: false,
  reactStrictMode: true,

  // FIX: Removed `env.NEXTAUTH_URL` exposure to the client bundle.
  // NEXTAUTH_URL is a server-only variable — putting it in `env:` sends it
  // to every browser that loads your app. Next.js already reads it server-side
  // automatically; no need to expose it here.

  compress: true,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@monaco-editor/react'],
  },
};

export default nextConfig;
