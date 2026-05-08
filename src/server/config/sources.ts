import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { Category, SourceConfig } from "../../shared/types.js";

const categorySchema = z.enum([
  "ai",
  "robotics",
  "chips",
  "internet",
  "bigtech",
  "research",
  "business",
  "policy",
  "other"
] satisfies [Category, ...Category[]]);

const sourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  categoryHint: categorySchema.optional(),
  language: z.enum(["zh", "en", "mixed"]).default("mixed"),
  weight: z.number().positive().default(1),
  enabled: z.boolean().default(true)
});

const sourcesFileSchema = z.object({
  sources: z.array(sourceSchema).min(1)
});

export function loadSources(filePath: string): SourceConfig[] {
  const resolved = path.resolve(filePath);
  const fallback = path.resolve("sources.example.yaml");
  const actualPath = existsSync(resolved) ? resolved : fallback;

  if (!existsSync(actualPath)) {
    throw new Error(`Sources file not found: ${resolved}`);
  }

  const parsed = YAML.parse(readFileSync(actualPath, "utf8"));
  return sourcesFileSchema.parse(parsed).sources;
}
