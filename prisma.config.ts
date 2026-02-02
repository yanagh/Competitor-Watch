import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load from .env.local first, then .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For migrations (direct database connection)
    url: process.env["DATABASE_URL"],
  },
});
