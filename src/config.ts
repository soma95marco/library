import process from "node:process";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  RABBITMQ_URL: z.url(),
  GUTENDEX_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`invalid environment:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const config = parsed.data;

export { config };
