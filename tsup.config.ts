import { defineConfig } from "tsup";

// Ship compiled ESM + type declarations. React is a peer dep, never bundled.
//
// The JavaScript here is the desktop entry only. The mobile entry is bundled by tsup.mobile.config.ts, which
// adds a "use client" directive that this entry must not carry (see package.json "build"). Both entries still
// get their declarations from this one run, so index.d.ts, mobile.d.ts and their shared chunk stay as they were.
export default defineConfig(options => ({
  entry: ["src/index.ts"],
  splitting: false,
  format: ["esm"],
  dts: { entry: ["src/index.ts", "src/mobile.ts"] },
  // A one-shot build starts from an empty dist. A watcher must not: it would delete dist/mobile.js, which only
  // `watch:mobile` (or `build`) writes, and every other entry's output with it.
  clean: !options.watch,
  external: ["react", "react-dom"],
}));
