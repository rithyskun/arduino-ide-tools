import js from '@eslint/js';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      'public/**',
      '.vercel/**',
      'tsconfig.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      // Warn on console.log but allow warn/error for server-side logging
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Catch unused variables — common source of bugs
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Prevent accidental use of == instead of ===
      'eqeqeq': ['error', 'always'],
      // No var — use const/let
      'no-var': 'error',
      // Prefer const where possible
      'prefer-const': 'error',
    },
  },
];
