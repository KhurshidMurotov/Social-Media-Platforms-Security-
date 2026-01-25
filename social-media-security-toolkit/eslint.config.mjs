import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

const nextCoreWebVitalsRules =
  nextPlugin.configs?.["core-web-vitals"]?.rules ?? nextPlugin.configs?.recommended?.rules ?? {};

export default [
  {
    ignores: [".next/**", "out/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["next.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@typescript-eslint": tseslint
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...nextCoreWebVitalsRules,
      ...(tseslint.configs?.recommended?.rules ?? {}),
      ...(reactPlugin.configs?.recommended?.rules ?? {}),
      ...(reactHooksPlugin.configs?.recommended?.rules ?? {}),
      // Next.js pages use React in scope automatically (React 17+)
      "react/react-in-jsx-scope": "off",
      // Prefer TypeScript's own undefined checks
      "no-undef": "off"
    }
  },
  {
    files: ["src/pages/api/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  }
];

