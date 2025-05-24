module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["unused-imports", "@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": "allow-with-description" }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",

    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",

    // https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
    "@typescript-eslint/ban-types": [
      "error",
      {
        extendDefaults: true,
        types: {
          "{}": false,
        },
      },
    ],
  },
  globals: {
    chrome: true,
    window: true,
  },
};
