import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.config.js'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        tsconfigRootDir: projectRoot,
        project: resolve(projectRoot, 'tsconfig.json'),
      },
      globals: {
        React: 'readonly',
        document: 'readonly',
        console: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        matchMedia: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
        cancelAnimationFrame: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        WebSocket: 'readonly',
        Worker: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        Image: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        crypto: 'readonly',
        WebAssembly: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-empty': 'off',
      'no-case-declarations': 'off',
      curly: ['error', 'all'],
      eqeqeq: 'off',
      'no-eval': 'off',
      'no-implied-eval': 'off',
      'no-new-func': 'off',
      'no-loss-of-precision': 'off',
      'no-useless-catch': 'off',
      'no-useless-escape': 'warn',
    },
  },
  eslintConfigPrettier,
];
