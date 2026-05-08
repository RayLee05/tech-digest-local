// @vitest-environment node

import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/server/config/env.js";
import { createSummaryProvider } from "../src/server/providers/factory.js";

describe("createSummaryProvider", () => {
  it("supports OpenAI-compatible providers with arbitrary models", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      APP_PORT: 3001,
      LLM_PROVIDER: "openai-compatible",
      LLM_API_KEY: "test-key",
      LLM_BASE_URL: "https://api.deepseek.com/v1",
      LLM_MODEL: "deepseek-v4flash"
    });

    expect(createSummaryProvider(env).name).toBe("openai-compatible:deepseek-v4flash");
  });

  it("can force local heuristic mode", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      APP_PORT: 3001,
      LLM_PROVIDER: "heuristic"
    });

    expect(createSummaryProvider(env).name).toBe("heuristic-local");
  });
});
