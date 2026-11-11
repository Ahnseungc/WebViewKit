import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/core.ts", "src/vue.ts", "src/react-router.tsx"],
  format: ["cjs", "esm"],
  dts: { compilerOptions: { composite: false, incremental: false } },
  tsconfig: "tsconfig.build.json",
  target: "es2018",
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react-router", "vue"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
