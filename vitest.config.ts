import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "client",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
      },
      {
        test: {
          name: "server",
          environment: "node",
          include: ["server/**/*.test.ts"],
          // PGlite spins up a fresh in-memory Postgres and replays every
          // migration in the first test of each file; under parallel load the
          // 5s default is not enough.
          testTimeout: 20000,
        },
      },
    ],
  },
});
