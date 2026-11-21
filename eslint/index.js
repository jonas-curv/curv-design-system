import tseslint from "typescript-eslint";
import curvPlugin from "./plugin.js";

/**
 * Shared ESLint flat config for every Curv OS app + this repo.
 *
 * Three presets, one rule set (see ./plugin.js):
 *
 *   import curv from "@curvgroup/design-system/eslint";      // default
 *   import { strict, migration } from "@curvgroup/design-system/eslint";
 *
 *   default    the established rules error; rules added in 0.5.0 warn, so an
 *              app that upgrades keeps a green CI while it migrates.
 *   strict     every rule errors. The target once an app is clean.
 *   migration  every rule warns. For an app still clearing the older rules.
 *
 *   export default [ ...curv, /* your app rules *​/ ];
 *
 * It only carries the design-language guards. Framework rules (React, Next,
 * import order) stay in each app so this never fights their setup.
 */

/** Every rule, with the severity the default preset gives it. */
const RULES = {
  "curv/no-uppercase-utility": "error",
  "curv/no-raw-hex": "error",
  "curv/no-palette-utility": "error",
  // New in 0.5.0: warnings first, errors once the apps are clean.
  "curv/no-arbitrary-text-size": "warn",
  "curv/no-wide-tracking": "warn",
  // Radius is a *concentric* (relational) rule, not a fixed one: a linter can't
  // compute concentricity, so curv-ui and design-review enforce it.
};

const every = (severity) => Object.fromEntries(Object.keys(RULES).map((rule) => [rule, severity]));

const preset = (rules) => [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    plugins: { curv: curvPlugin },
    rules,
  },
];

export const recommended = preset(RULES);
export const strict = preset(every("error"));
export const migration = preset(every("warn"));

export default recommended;
