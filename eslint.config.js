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
  // ── TerraFusion Constitution Gate #1 ─────────────────────────────
  // Ban supabase.from()/rpc() in components — all data access must go through hooks/data layer
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message: "❌ CONSTITUTION GATE #1: supabase.from() is banned in components. Move data access to src/hooks/ or src/services/.",
        },
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='rpc']",
          message: "❌ CONSTITUTION GATE #1: supabase.rpc() is banned in components. Move data access to src/hooks/ or src/services/.",
        },
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='functions']",
          message: "❌ CONSTITUTION GATE #1: supabase.functions.invoke() is banned in components. Move to src/hooks/ or src/services/.",
        },
      ],
    },
  },
  // ── TerraFusion Constitution Gate #2 ─────────────────────────────
  // Ban invalidateQueries outside the canonical invalidation registry
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/queryInvalidation.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='invalidateQueries']",
          message: "❌ CONSTITUTION GATE #2: invalidateQueries() is banned outside src/lib/queryInvalidation.ts. Use canonical invalidators (invalidateCounty, invalidateParcel, etc.).",
        },
      ],
    },
  },
  // ── TerraFusion Constitution Gate #3 ─────────────────────────────
  // Ban raw string navigation outside isLegalNavigation()-validated paths
  // (catches accidental hardcoded stale module IDs)
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Legacy dashboard IDs that were collapsed into the 4-module IA
        {
          selector: "Literal[value='analytics']",
          message: "❌ CONSTITUTION GATE #3: Stale module ID 'analytics' detected. Use 'factory:analytics' via handleNavigate().",
        },
        {
          selector: "Literal[value='vei']",
          message: "❌ CONSTITUTION GATE #3: Stale module ID 'vei' detected. Use 'factory:vei' via handleNavigate().",
        },
        {
          selector: "Literal[value='geoequity']",
          message: "❌ CONSTITUTION GATE #3: Stale module ID 'geoequity' detected. Use 'factory:geoequity' via handleNavigate().",
        },
        {
          selector: "Literal[value='trust']",
          message: "❌ CONSTITUTION GATE #3: Stale module ID 'trust' detected. Use 'registry:trust' via handleNavigate().",
        },
        {
          selector: "Literal[value='field']",
          message: "❌ CONSTITUTION GATE #3: Stale module ID 'field' detected. Use 'workbench:field' via handleNavigate().",
        },
      ],
    },
  },
);
