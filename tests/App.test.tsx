import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/web/App.js";

describe("App", () => {
  it("renders latest digest items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/digests/latest") {
          return new Response(
            JSON.stringify({
              digest: {
                date: "2026-05-07",
                generatedAt: "2026-05-07T00:30:00.000Z",
                model: "test",
                itemCount: 1,
                items: [
                  {
                    id: "item-1",
                    title: "OpenAI releases a new model",
                    summaryZh: "OpenAI 发布新模型。",
                    category: "ai",
                    importanceScore: 91,
                    importanceReason: "行业影响高。",
                    sourceName: "OpenAI",
                    sourceUrl: "https://openai.com/news/rss.xml",
                    originalUrl: "https://openai.com/news/example"
                  }
                ]
              },
              sources: []
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("{}", { status: 404 });
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("OpenAI releases a new model")).toBeInTheDocument();
    });
  });
});
