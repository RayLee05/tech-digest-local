import cron from "node-cron";
import type { AppEnv } from "../config/env.js";
import type { DigestJobRunner } from "./digestJob.js";

export function startScheduler(env: AppEnv, jobRunner: DigestJobRunner): void {
  cron.schedule(
    env.DIGEST_CRON,
    async () => {
      try {
        await jobRunner.run();
      } catch (error) {
        console.error("Scheduled digest job failed", error);
      }
    },
    {
      timezone: env.TIMEZONE
    }
  );
}
