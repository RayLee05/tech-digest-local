import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_HOST: z.string().default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().positive(),
  TIMEZONE: z.string().default("Asia/Shanghai"),
  DIGEST_CRON: z.string().default("30 8 * * *"),
  DIGEST_TOP_N: z.coerce.number().int().positive().default(12),
  DATABASE_PATH: z.string().default("data/tech-digest.sqlite"),
  SOURCES_FILE: z.string().default("sources.yaml"),
  LLM_PROVIDER: z.enum(["openai", "openai-compatible", "heuristic"]).optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  FETCH_LOOKBACK_HOURS: z.coerce.number().int().positive().default(36),
  RUN_ON_START: booleanFromEnv.default(false)
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(overrides: Partial<Record<keyof AppEnv, string | number | boolean | undefined>> = {}): AppEnv {
  const appPort = process.env.APP_PORT ?? (nodeEnv === "development" ? "3001" : "3000");

  return envSchema.parse({
    ...process.env,
    NODE_ENV: nodeEnv,
    APP_PORT: appPort,
    ...overrides
  });
}
