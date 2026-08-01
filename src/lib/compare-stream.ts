/**
 * SSE client for POST /api/v1/stream
 * @see docs/STREAMING.md
 */

import type { SearchMetadata } from "@/lib/search-metadata";
import { parseSearchMetadata } from "@/lib/search-metadata";
import type { SideSearchCapability } from "@/lib/search-capability-state";
import { parseSearchCapability } from "@/lib/search-capability-state";
import { apiUrl } from "@/lib/api-url";
import { redactSensitiveText } from "@/lib/redact-error";

export type StreamSide = "left" | "right";
export type SearchMode = "auto" | "force" | "off";

export type StreamEvent =
  | {
      type: "start";
      side: StreamSide;
      model: string;
      provider?: string;
      searchCapability?: SideSearchCapability;
    }
  | { type: "token"; side: StreamSide; delta: string }
  | { type: "done"; side: StreamSide; elapsed: number; text?: string; searchMetadata?: SearchMetadata }
  | { type: "error"; side: StreamSide; message: string; elapsed?: number }
  | { type: "search_start"; side: StreamSide; provider?: string; mode?: string }
  | { type: "search_sources"; side: StreamSide; queries?: string[]; provider?: string }
  | { type: "grounding"; side: StreamSide; provider?: string; phase?: string; label?: string }
  | { type: "citations"; side: StreamSide; metadata?: SearchMetadata }
  | {
      type: "search_complete";
      side: StreamSide;
      metadata?: SearchMetadata;
      skipped?: boolean;
      reason?: string;
    }
  | {
      type: "complete";
      prompt: string;
      leftModel: string;
      rightModel: string;
      searchMode?: SearchMode;
    };

export type CompareStreamBody = {
  prompt: string;
  leftModel: string;
  rightModel: string;
  leftProvider?: string;
  rightProvider?: string;
  searchMode?: SearchMode;
};

function parseSearchSideEvent(
  eventType: string,
  data: Record<string, unknown>
): StreamEvent | null {
  const side = data.side as StreamSide;
  switch (eventType) {
    case "search_start":
      return {
        type: "search_start",
        side,
        provider: data.provider != null ? String(data.provider) : undefined,
        mode: data.mode != null ? String(data.mode) : undefined,
      };
    case "search_sources":
      return {
        type: "search_sources",
        side,
        queries: Array.isArray(data.queries) ? data.queries.map(String) : [],
        provider: data.provider != null ? String(data.provider) : undefined,
      };
    case "grounding":
      return {
        type: "grounding",
        side,
        provider: data.provider != null ? String(data.provider) : undefined,
        phase: data.phase != null ? String(data.phase) : undefined,
        label: data.label != null ? String(data.label) : undefined,
      };
    case "citations":
      return {
        type: "citations",
        side,
        metadata: parseSearchMetadata(data.metadata),
      };
    case "search_complete":
      return {
        type: "search_complete",
        side,
        metadata: data.metadata ? parseSearchMetadata(data.metadata) : undefined,
        skipped: Boolean(data.skipped),
        reason: data.reason != null ? String(data.reason) : undefined,
      };
    default:
      return null;
  }
}

export function parseSseChunk(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const parts = buffer.split(/\r\n\r\n|\n\n|\r\r/);
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.trim()) continue;
    let eventType = "message";
    const dataLines: string[] = [];

    for (const line of part.split(/\r\n|\n|\r/)) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) continue;

    try {
      const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      switch (eventType) {
        case "start":
          events.push({
            type: "start",
            side: data.side as StreamSide,
            model: String(data.model ?? ""),
            provider: data.provider != null ? String(data.provider) : undefined,
            searchCapability: parseSearchCapability(data.searchCapability),
          });
          break;
        case "token":
          events.push({
            type: "token",
            side: data.side as StreamSide,
            delta: String(data.delta ?? ""),
          });
          break;
        case "done":
          events.push({
            type: "done",
            side: data.side as StreamSide,
            elapsed: Number(data.elapsed ?? 0),
            text: data.text != null ? String(data.text) : undefined,
            searchMetadata: data.searchMetadata
              ? parseSearchMetadata(data.searchMetadata)
              : undefined,
          });
          break;
        case "error":
          events.push({
            type: "error",
            side: data.side as StreamSide,
            message: redactSensitiveText(String(data.message ?? "Stream error")),
            elapsed: data.elapsed != null ? Number(data.elapsed) : undefined,
          });
          break;
        case "complete":
          events.push({
            type: "complete",
            prompt: String(data.prompt ?? ""),
            leftModel: String(data.leftModel ?? ""),
            rightModel: String(data.rightModel ?? ""),
            searchMode:
              data.searchMode === "force" || data.searchMode === "off"
                ? data.searchMode
                : data.searchMode === "auto"
                  ? "auto"
                  : undefined,
          });
          break;
        default: {
          const searchEvent = parseSearchSideEvent(eventType, data);
          if (searchEvent) events.push(searchEvent);
          break;
        }
      }
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, rest };
}

export async function consumeCompareStream(options: {
  url?: string;
  body: CompareStreamBody;
  headers: Record<string, string>;
  signal?: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> {
  const url = options.url ?? apiUrl("/api/v1/stream");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...options.headers,
    },
    body: JSON.stringify(options.body),
    signal: options.signal,
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw || `HTTP ${response.status}`;
    try {
      const err = JSON.parse(raw) as unknown;
      if (err && typeof err === "object" && typeof (err as { detail?: unknown }).detail === "string") {
        message = (err as { detail: string }).detail;
      }
    } catch {
      // Plain-text provider errors are already captured in message.
    }
    throw new Error(redactSensitiveText(message));
  }

  if (!response.body) {
    throw new Error("No response body for stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Bound buffer to prevent memory exhaustion from malformed/adversarial streams.
  // 4 MB is generous for two concurrent LLM responses.
  const MAX_BUFFER_BYTES = 4 * 1024 * 1024;
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BUFFER_BYTES) {
        throw new Error("Stream response exceeded size limit");
      }

      buffer += chunk;

      // Guard against a pathological single chunk with no delimiters
      if (buffer.length > MAX_BUFFER_BYTES) {
        throw new Error("Stream buffer exceeded size limit");
      }

      const { events, rest } = parseSseChunk(buffer);
      buffer = rest;
      for (const event of events) {
        options.onEvent(event);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const { events } = parseSseChunk(buffer + "\n\n");
      for (const event of events) {
        options.onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
