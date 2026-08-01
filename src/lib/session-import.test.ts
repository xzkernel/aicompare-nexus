import { describe, expect, it } from "vitest";

import {
  MAX_IMPORT_ROWS,
  MAX_PROMPT_CHARS,
  encodeCsvCell,
  parseSessionImport,
} from "./session-import";

describe("session imports", () => {
  it("preserves prompts accepted by the backend", () => {
    const prompt = "p".repeat(32_000);
    const records = parseSessionImport(JSON.stringify({ sessions: [{
      prompt,
      leftModel: "openai:model",
      rightModel: "custom:vendor:model",
    }] }), "backup.json");

    expect(records[0].prompt).toBe(prompt);
  });

  it("bounds fields and ignores sync metadata from JSON", () => {
    const records = parseSessionImport(JSON.stringify({ sessions: [{
      id: "id-1",
      prompt: "p".repeat(MAX_PROMPT_CHARS + 50),
      leftModel: "openai:model",
      rightModel: "custom:vendor:model",
      deletedAt: 1,
      deviceId: "untrusted",
    }] }), "backup.JSON".toLowerCase());

    expect(records).toHaveLength(1);
    expect(records[0].prompt).toHaveLength(MAX_PROMPT_CHARS);
    expect(records[0]).not.toHaveProperty("deletedAt");
  });

  it("rejects excessive row counts", () => {
    const sessions = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
      prompt: `prompt ${index}`,
      leftModel: "a:model",
      rightModel: "b:model",
    }));
    expect(() => parseSessionImport(JSON.stringify({ sessions }), "many.json")).toThrow(/limited/);
  });

  it("protects exported user-controlled CSV cells", () => {
    expect(encodeCsvCell("=HYPERLINK(1)", true)).toBe('"\'\t=HYPERLINK(1)"');
  });
});
