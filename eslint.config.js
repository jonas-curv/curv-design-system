// This repo dogfoods its own shared config — the same guards every OS app gets.
import curv, { strict } from "./eslint/index.js";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  ...curv,
  // The package's own source is clean of the type rules, so it holds them as errors.
  ...strict.map((config) => ({ ...config, files: ["src/**/*.{ts,tsx}"] })),
];
