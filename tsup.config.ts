import { defineConfig } from "tsup";

// Ship compiled ESM + type declarations. React is a peer dep, never bundled.
export default defineConfig({
  entry: ["src/index.ts", "src/mobile.ts"],
  splitting: false,
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
});
