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
    ],
  },
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
];
