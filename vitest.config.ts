import { defineConfig, defaultExclude } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // 기본 제외값 + E2E 폴더만 추가 제외
    exclude: [...defaultExclude, "tests/**", "playwright.config.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        ".next/**",
        "**/.next/**",
        "dist/**",
        "build/**",
        "out/**",
        "public/**",
        "scripts/**",
        "docs/**",
        "supabase/**",
        "src/app/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
