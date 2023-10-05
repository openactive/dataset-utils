module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: 'airbnb-base',
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'object-curly-newline': ['error', {
      ObjectExpression: {
        multiline: true, minProperties: 3, consistent: true,
      },
      ObjectPattern: { multiline: true, consistent: true },
      ImportDeclaration: 'never',
      ExportDeclaration: {
        multiline: true, minProperties: 3, consistent: true,
      },
    }],
    'arrow-parens': ['error', 'as-needed', {
      requireForBlockBody: true,
    }],
    'max-classes-per-file': 'off',
    'max-len': 'off',
    'no-await-in-loop': 'off',
    'no-console': 'off',
    'no-continue': 'off',
    'no-restricted-syntax': 'off',
    'func-names': 'off',
    'no-return-await': 'off',
    'prefer-arrow-callback': 'off',
    'class-methods-use-this': [
      'error',
      {
        exceptMethods: [
        ],
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*-test.js',
        ],
      },
    ],
    'no-underscore-dangle': 'off',
    'no-use-before-define': ['error', { functions: false, classes: false }],
  },
};
