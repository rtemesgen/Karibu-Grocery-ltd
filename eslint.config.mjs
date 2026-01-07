import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

// Enable using legacy shareable configs (like airbnb-base) with ESLint v9 flat config
const baseDir = fileURLToPath(new URL(".", import.meta.url));
const compat = new FlatCompat({ baseDirectory: baseDir });

export default defineConfig([
  // Airbnb base (legacy config via compat)
  ...compat.extends("airbnb-base"),
  // Our project defaults
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2021,
      sourceType: "script",
    },
    rules: {
      // Light relaxations commonly needed in this project
      "no-alert": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);
