module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:import/recommended',
    'plugin:sonarjs/recommended',
    'plugin:promise/recommended',
    'plugin:unicorn/recommended',
    'prettier'
  ],
  plugins: ['security'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    'import/resolver': {
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
    'import/ignore': ['node_modules', '\\.svg$', '\\.json$']
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    'vue/max-attributes-per-line': ['warn', { singleline: 5 }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    'import/no-unresolved': ['warn', { ignore: ['\\.svg$'] }],
    'import/no-extraneous-dependencies': 'warn',

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
    'security/detect-unsafe-regex': 'warn',
    'import/namespace': 'off',
    'import/default': 'off',
    'import/named': 'off',
    'import/newline-after-import': 'warn',
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
        alphabetize: { order: 'asc' }
      }
    ],

    'sonarjs/no-duplicate-string': ['warn', { threshold: 6 }],
    'sonarjs/cognitive-complexity': ['warn', 25],

    'security/detect-object-injection': 'off',

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
    'unicorn/prefer-switch': 'warn'
  }
}
