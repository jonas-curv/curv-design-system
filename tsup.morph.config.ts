import { defineConfig } from "tsup";

// The morph kit, built after the main and home configs (see package.json
// "build") so their outputs stay byte-identical. One standalone file,
// dist/morph.js, keeping its "use client" directive. It imports React and
// nothing else, so vendoring it changes no desktop, mobile or home surface.
export default defineConfig({
  entry: ["src/morph.ts"],
  splitting: false,
  format: ["esm"],
  dts: true,
  clean: false,
  external: ["react", "react-dom"],
});
