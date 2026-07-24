import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        Math: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-prototype-builtins': 'off',
      'no-useless-assignment': 'off'
    }
  }
];
