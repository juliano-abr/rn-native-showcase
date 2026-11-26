const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const reactHooks = require("eslint-plugin-react-hooks");
const react = require("eslint-plugin-react");

module.exports = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/.expo/**",
      "**/android/**",
      "**/ios/**",
      "**/*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/demo/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "error",
      "react/self-closing-comp": "error",
    },
  },
  {
    files: ["**/jest.setup.ts", "**/__tests__/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
