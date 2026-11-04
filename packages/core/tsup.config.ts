import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: { compilerOptions: { composite: false, incremental: false } },
  tsconfig: "tsconfig.build.json",
  target: "es2018",
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  esbuildOptions(options) {
    options.jsx = "automatic";
    options.jsxImportSource = "@emotion/react";
  },
});
