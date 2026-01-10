// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "packages/*/dist/",
      "packages/*/cdk.out/",
      "eslint.config.js",
      "**/*.ohm-bundle.js",
      "**/*.ohm-bundle.d.ts",
      "cdk/jest.config.js"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "semi": ["error", "always"],
      "@typescript-eslint/consistent-type-definitions": [
        "error",
        "type"
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: true,
          allowRegExp: true
        },
      ],
      "indent": ["error", 2]
    }
  }
);