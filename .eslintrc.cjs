/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  rules: {
    "@typescript-eslint/no-unnecessary-type-constraint": "warn",
    // Svelte doesn't correctly compile if imports of the generated /modules
    // aren't imported as 'import type' in other parts of the generated
    // querybuilder, so set this option to ensure we always do that
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-namespace": "off"
  }
};
