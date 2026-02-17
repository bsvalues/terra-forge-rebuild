import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // ── TerraFusion Constitution Guardrails ──────────────────────────
  // Ban supabase.from() in components — all data access must go through hooks/data layer
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message: "❌ DATA CONSTITUTION: supabase.from() is banned in components. Move data access to src/hooks/ or src/data/.",
        },
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='rpc']",
          message: "❌ DATA CONSTITUTION: supabase.rpc() is banned in components. Move data access to src/hooks/ or src/data/.",
        },
      ],
    },
  },
  // Ban invalidateQueries outside the canonical invalidation registry
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/queryInvalidation.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='invalidateQueries']",
          message: "❌ DATA CONSTITUTION: invalidateQueries() is banned outside src/lib/queryInvalidation.ts. Use canonical invalidators (invalidateCounty, invalidateParcel, etc.).",
        },
      ],
    },
  },
);
