import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.stylistic,
  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      // parserOptions: {
      //   project: true,
      // },
    },
    rules: {
      "@typescript-eslint/no-unnecessary-type-constraint": "warn",
      // Svelte doesn't correctly compile if imports of the generated /modules
      // aren't imported as 'import type' in other parts of the generated
      // querybuilder, so set this option to ensure we always do that
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
