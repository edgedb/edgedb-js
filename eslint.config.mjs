import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // turn off stylistic rules that results with errors
      "@typescript-eslint/class-literal-property-style": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-confusing-non-null-assertion": "off",
      "no-empty-function": "off", // should be off
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/prefer-for-of": "off",
    },
  }
);
