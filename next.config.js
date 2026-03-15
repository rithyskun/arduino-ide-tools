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
  // Turbopack configuration
  turbopack: {},

  async headers() {
    return [
      {
        // Apply CSP to all HTML page responses (not API routes)
        source: '/((?!api/).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
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

  // Allow images from any source (avatars etc.)
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Environment variables for client-side access
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Compression and performance
  compress: true,
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@monaco-editor/react'],
  },
};

module.exports = nextConfig;
