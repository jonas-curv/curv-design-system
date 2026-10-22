import { defineConfig } from "tsup";

// The mobile entry, built after the main config (see package.json "build"). esbuild drops the "use client"
// directives of the modules it bundles, and a server layout (a Next.js layout.tsx) that imports MobileTopBar or
// MobileTabBar from dist/mobile.js needs the directive on the file it imports. So the banner puts one at the top
// of the single bundle. The main entry gets none: it is also imported by server code that has no client boundary.
// Declarations (dist/mobile.d.ts) come from the main config, so this run emits JavaScript only and cleans nothing.
export default defineConfig({
  entry: ["src/mobile.ts"],
  splitting: false,
  format: ["esm"],
  dts: false,
  clean: false,
  external: ["react", "react-dom"],
  banner: { js: '"use client";' },
});
