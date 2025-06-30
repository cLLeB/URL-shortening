module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'warn',
    'no-var': 'warn',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'template-curly-spacing': 'warn',
    'arrow-spacing': 'warn',
    'comma-dangle': ['warn', 'always-multiline'],
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single'],
    'indent': ['warn', 2],
    'max-len': ['warn', { code: 120, ignoreUrls: true }],
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 1 }],
    'no-useless-catch': 'warn',
    'no-unreachable': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
