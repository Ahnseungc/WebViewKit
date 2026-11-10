// Svelte 5 는 ESM 전용이라 Svelte 바인딩 테스트만 vitest 로 돌린다 (나머지는 jest)
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: "jsdom",
    include: ["src/svelte/__tests__/**/*.test.ts"],
  },
});
