module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
  // rules: {
  //   "semicolon": [true, "always"],
  // }
  "rules": {
    "indent": [
      "error",
      2
    ],
    // note you must disable the base rule as it can report incorrect errors
    "semi": "off",
    "@typescript-eslint/semi": [
      "error",
      "always"
    ],
    // note you must disable the base rule as it can report incorrect errors
    "space-before-function-paren": "off",
    "@typescript-eslint/space-before-function-paren": [
      "error",
      {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
      }
    ],
    // note you must disable the base rule as it can report incorrect errors
    "keyword-spacing": "off",
    "@typescript-eslint/keyword-spacing": [
      "error",
      {
        "overrides": {
          "if": {
            "after": false
          },
          "for": {
            "after": false
          },
          "while": {
            "after": false
          },
          "switch": {
            "after": false
          }
        }
      }
    ],
    "object-curly-spacing": [
      "error",
      "never"
    ]
  }
};