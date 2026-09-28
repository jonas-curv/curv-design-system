import { defineConfig } from "tsup";

// The home kit, built after the main config (see package.json "build") so the
// desktop and mobile outputs, including their shared .d.ts chunk, stay
// byte-identical. Two standalone files: dist/home.js (server-safe panels and
// row classes) re-exports dist/home-client.js (CountText, MonthClock), which
// keeps its "use client" directive. Neither imports the desktop or mobile
// entries, and React is the only external.
export default defineConfig({
  entry: ["src/home.ts", "src/home-client.ts"],
  splitting: false,
  format: ["esm"],
  dts: true,
  clean: false,
  external: ["react", "react-dom"],
  esbuildPlugins: [
    {
      name: "home-client-stays-a-file",
      setup(build) {
        build.onResolve({ filter: /^\.\/home-client\.js$/ }, () => ({ path: "./home-client.js", external: true }));
      },
    },
  ],
});
