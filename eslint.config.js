// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/*.config.{js,cjs,mjs,ts}",
      "**/vite.config.*",
      "apps/client/dist/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Surface render-storm / stale-closure bugs in React effects.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Lots of intentional discards in the codebase (Phaser callbacks, audio, etc.)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-expect-error": "allow-with-description", "ts-ignore": false },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-constant-condition": ["warn", { checkLoops: false }],
      "prefer-const": "warn",
    },
  },
  {
    files: ["apps/server/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["tooling/**/*.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Service-worker file runs in a dedicated worker scope; lint it with
    // service-worker globals so `self`, `caches`, `fetch`, etc. resolve.
    files: ["apps/client/public/sw.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  }
);
