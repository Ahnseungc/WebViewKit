// Svelte 5 는 ESM 전용이라 Svelte 바인딩 테스트만 vitest 로 돌린다 (나머지는 jest)
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

const mock = (file) =>
  fileURLToPath(
    new URL(`src/sveltekit/__tests__/mocks/${file}`, import.meta.url)
  );

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    // `/sveltekit` 테스트용 SvelteKit 가상 모듈
    alias: {
      "$app/navigation": mock("app-navigation.ts"),
      "$app/state": mock("app-state.svelte.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "src/svelte/__tests__/**/*.test.ts",
      "src/sveltekit/__tests__/**/*.test.ts",
    ],
  },
});
