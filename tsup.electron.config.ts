import { defineConfig } from "tsup";

export default defineConfig([
  // Main process
  {
    entry: ["src/electron/main.ts"],
    format: ["cjs"],
    outDir: "dist-electron",
    clean: true,
    sourcemap: true,
    target: "node20",
    external: ["electron"],
    noExternal: ["puppeteer", "unified", "remark-parse", "remark-gfm", "unist-util-visit"],
  },
  // Preload script
  {
    entry: ["src/electron/preload.ts"],
    format: ["cjs"],
    outDir: "dist-electron",
    sourcemap: true,
    target: "node20",
    external: ["electron"],
  },
]);
