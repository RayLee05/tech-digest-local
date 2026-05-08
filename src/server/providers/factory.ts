import type { AppEnv } from "../config/env.js";
import type { SummaryProvider } from "../interfaces.js";
import { HeuristicSummaryProvider } from "./heuristicSummaryProvider.js";
import { OpenAiCompatibleSummaryProvider } from "./openAiCompatibleSummaryProvider.js";
import { OpenAiSummaryProvider } from "./openAiSummaryProvider.js";

export function createSummaryProvider(env: AppEnv): SummaryProvider {
  if (env.LLM_PROVIDER === "heuristic") {
    return new HeuristicSummaryProvider();
  }

  if (env.LLM_PROVIDER === "openai-compatible" || (env.LLM_API_KEY && env.LLM_BASE_URL)) {
    if (!env.LLM_API_KEY || !env.LLM_BASE_URL) {
      throw new Error("LLM_API_KEY and LLM_BASE_URL are required for openai-compatible providers.");
    }
    return new OpenAiCompatibleSummaryProvider({
      apiKey: env.LLM_API_KEY,
      baseUrl: env.LLM_BASE_URL,
      model: env.LLM_MODEL ?? env.OPENAI_MODEL
    });
  }

  if (!env.OPENAI_API_KEY) {
    return new HeuristicSummaryProvider();
  }
  return new OpenAiSummaryProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
}
