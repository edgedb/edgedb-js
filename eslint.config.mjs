import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      // "@typescript-eslint/no-unnecessary-type-constraint": "warn",
      // Svelte doesn't correctly compile if imports of the generated /modules
      // aren't imported as 'import type' in other parts of the generated
      // querybuilder, so set this option to ensure we always do that
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-prototype-builtins": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "no-case-declarations": "off",
      "no-constant-binary-expression": "off",
    },
  }
);
