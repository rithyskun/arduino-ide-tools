/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration
  turbopack: {},
  
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
