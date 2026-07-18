import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginPromise from 'eslint-plugin-promise'
import pluginUnicorn from 'eslint-plugin-unicorn'
import pluginSecurity from 'eslint-plugin-security'
import pluginSonarjs from 'eslint-plugin-sonarjs'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import pluginImportX from 'eslint-plugin-import-x'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  pluginPromise.configs['flat/recommended'],
  pluginUnicorn.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    plugins: {
      security: pluginSecurity,
      sonarjs: pluginSonarjs,
      'import-x': pluginImportX
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': ['warn', { singleline: 5 }],

      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'import-x/no-unresolved': ['warn', { ignore: ['\\.svg$'] }],
      'import-x/no-extraneous-dependencies': 'warn',
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/named': 'off',
      'import-x/newline-after-import': 'warn',
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc' }
        }
      ],

      'sonarjs/no-duplicate-string': ['warn', { threshold: 10 }],
      'sonarjs/cognitive-complexity': ['warn', 25],

      'promise/always-return': 'off',
      'promise/catch-or-return': ['warn', { allowFinally: true }],
      'promise/no-callback-in-promise': 'off',

      'unicorn/filename-case': 'off',
      'unicorn/prefer-export-from': 'warn',
      'unicorn/prefer-set-has': 'warn',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/consistent-destructuring': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/preserve-caught-error': 'off',
      'unicorn/prefer-switch': 'warn',

      'vuejs-accessibility/click-events-have-key-events': 'off',

      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-new-buffer': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
      'security/detect-unsafe-regex': 'warn'
    },
    settings: {
      'import-x/resolver': {
        alias: {
          map: [
            ['src', './src'],
            ['app', './src'],
            ['components', './src/components'],
            ['pages', './src/pages'],
            ['layouts', './src/layouts'],
            ['assets', './src/assets'],
            ['boot', './src/boot'],
            ['stores', './src/stores'],
            ['router', './src/router']
          ],
          extensions: ['.js', '.vue']
        }
      },
      'import-x/ignore': ['node_modules', '\\.svg$', '\\.json$']
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.quasar/**', 'src-pwa/**']
  }
]
