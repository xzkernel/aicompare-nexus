import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeCompareStream, parseSseChunk } from "./compare-stream";

afterEach(() => vi.unstubAllGlobals());

describe("parseSseChunk", () => {
  it("parses CRLF-delimited events and preserves a partial event", () => {
    const parsed = parseSseChunk(
      'event: token\r\ndata: {"side":"left","delta":"a"}\r\n\r\nevent: token\r\ndata: {"side":"right"'
    );

    expect(parsed.events).toEqual([{ type: "token", side: "left", delta: "a" }]);
    expect(parsed.rest).toContain("event: token");
  });

  it("redacts credentials in provider error events", () => {
    const parsed = parseSseChunk(
      'event: error\n' +
      'data: {"side":"left","message":"authorization: Bearer secret-value-123456789"}\n\n'
    );

    expect(parsed.events[0]).toEqual({
      type: "error",
      side: "left",
      message: "[REDACTED]",
    });
  });
});

describe("consumeCompareStream", () => {
  it("preserves a plain-text HTTP error without consuming the body twice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    })));

    await expect(consumeCompareStream({
      url: "https://example.test/stream",
      body: { prompt: "p", leftModel: "a", rightModel: "b" },
      headers: {},
      onEvent: () => undefined,
    })).rejects.toThrow("provider unavailable");
  });
});
