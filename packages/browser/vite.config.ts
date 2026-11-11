import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages 는 /webview-kit/ 하위에 배포한다 (.github/workflows/pages.yml)
  base: process.env.DEMO_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      // 데모는 빌드 없이 core 소스를 바로 사용
      "@ahnseungchan/webviewkit": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url)
      ),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
