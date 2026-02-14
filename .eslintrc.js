module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  rules: {
    // Allow console.log in CLI applications
    'no-console': 'off',
    // TypeScript handles no-undef checking
    'no-undef': 'off',
  },
  env: {
    node: true,
    es2022: true,
  },
  overrides: [
    {
      // Type-aware linting for non-test TypeScript files
      files: ['src/**/*.ts'],
      excludedFiles: ['src/**/*.test.ts'],
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    {
      // Simpler linting for test files (no type checking)
      files: ['src/**/*.test.ts'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        // Relax rules for test files
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};