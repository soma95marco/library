import { existsSync } from "node:fs";
import process from "node:process";
import { defineConfig } from "vitest/config";

// the suite talks to the mariadb and rabbitmq from docker compose; locally the credentials come
// from .env, in ci they are already exported by the workflow
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  test: {
    // the tests share one reviews table, so files must not overlap
    fileParallelism: false,
  },
});
