import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const FORBIDDEN_IMPORTS = {
  core: ['**/core', '**/core/**'],
  format: ['**/format', '**/format/**'],
  source: ['**/source', '**/source/**'],
  workers: ['**/workers', '**/workers/**'],
  components: ['**/components', '**/components/**'],
  app: ['**/app', '**/app/**']
};

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unsafe-function-type': 'error',
    },
  },
  {
    files: ['src/contracts/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.core, ...FORBIDDEN_IMPORTS.format, ...FORBIDDEN_IMPORTS.source, ...FORBIDDEN_IMPORTS.workers, ...FORBIDDEN_IMPORTS.components, ...FORBIDDEN_IMPORTS.app],
          message: 'Contracts (contracts/) no debe importar nada de otras áreas.'
        }]
      }]
    }
  },
  {
    files: ['src/core/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.format, ...FORBIDDEN_IMPORTS.source, ...FORBIDDEN_IMPORTS.workers, ...FORBIDDEN_IMPORTS.components, ...FORBIDDEN_IMPORTS.app],
          message: 'Core (core/) solo puede importar de contracts.'
        }]
      }]
    }
  },
  {
    files: ['src/format/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.source, ...FORBIDDEN_IMPORTS.workers, ...FORBIDDEN_IMPORTS.components, ...FORBIDDEN_IMPORTS.app],
          message: 'Format (format/) solo puede importar de core y contracts.'
        }]
      }]
    }
  },
  {
    files: ['src/source/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.core, ...FORBIDDEN_IMPORTS.format, ...FORBIDDEN_IMPORTS.workers, ...FORBIDDEN_IMPORTS.components, ...FORBIDDEN_IMPORTS.app],
          message: 'Source (source/) solo puede importar de contracts.'
        }]
      }]
    }
  },
  {
    files: ['src/workers/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.source, ...FORBIDDEN_IMPORTS.components, ...FORBIDDEN_IMPORTS.app],
          message: 'Workers (workers/) solo puede importar format, core y contracts.'
        }]
      }]
    }
  },
  {
    files: ['src/app/**/*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [...FORBIDDEN_IMPORTS.format],
          message: 'App (app/) no debe importar de format directamente. Todo acceso pasa por el Worker.'
        }]
      }]
    }
  }
)
