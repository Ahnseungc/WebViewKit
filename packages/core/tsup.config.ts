import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/core.ts"],
  format: ["cjs", "esm"],
  dts: { compilerOptions: { composite: false, incremental: false } },
  tsconfig: "tsconfig.build.json",
  target: "es2018",
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
