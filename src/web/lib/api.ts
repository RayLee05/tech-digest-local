import type { Digest, DigestSummaryResponse, JobResult, SourceStatus } from "../../shared/types.js";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  latest: () => request<DigestSummaryResponse>("/api/digests/latest"),
  digest: (date: string) => request<DigestSummaryResponse>(`/api/digests/${date}`),
  sources: () => request<SourceStatus[]>("/api/sources"),
  runJob: () =>
    request<JobResult>("/api/jobs/run", {
      method: "POST"
    })
};

export type { Digest, DigestSummaryResponse, JobResult, SourceStatus };
