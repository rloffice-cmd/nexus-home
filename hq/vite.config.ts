import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ‏base יחסי: התוצר מוגש תחת /next/ ב-GitHub Pages לצד האפליקציה החיה.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "../next", emptyOutDir: true },
});
