// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Change '/project-dashboard/' to your GitHub repo name
export default defineConfig({
  base: "/github-projects-dashboard/",
  build: {
    outDir: "docs"
  },
  plugins: [react()],
});
