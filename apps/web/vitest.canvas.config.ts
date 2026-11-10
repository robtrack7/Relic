import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/world-objects.test.tsx",
      "tests/object-projection.test.ts",
      "tests/viewport.test.ts",
      "tests/manipulation.test.ts",
      "tests/zoom.test.ts",
      "tests/workspace-shell.test.tsx",
      "tests/carriage-integration.test.tsx",
      "tests/librarian-ui.test.tsx",
      "tests/canvas-workspace.test.tsx",
      "tests/canvas-controls.test.tsx",
      "tests/spatial-collection.test.tsx",
      "tests/interactive-desk.test.tsx",
      "tests/placement-history.test.tsx",
      "tests/desk-surface.test.tsx",
      "tests/finder.test.tsx",
      "tests/floating-surface.test.tsx",
      "tests/text-editor.test.tsx"
    ]
  }
});
