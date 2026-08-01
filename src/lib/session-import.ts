import type { ComparisonSessionInput, ComparisonVerdict } from "@/lib/idb/sessions-store";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1_000;
export const MAX_PROMPT_CHARS = 32_000;
const MAX_RESPONSE_CHARS = 500_000;
const MAX_MODEL_CHARS = 256;
const MAX_ID_CHARS = 128;
const CSV_SAFE_PREFIX = "'\t";

export type SessionImportRecord = ComparisonSessionInput & {
  id?: string;
  timestamp?: number;
};

export function encodeCsvCell(
  value: string | number | boolean | undefined,
  userControlled = false
): string {
  let text = value == null ? "" : String(value);
  if (userControlled && (text.startsWith(CSV_SAFE_PREFIX) || /^[\s]*[=+\-@]/.test(text))) {
    text = CSV_SAFE_PREFIX + text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function decodeCsvCell(value: string): string {
  return value.startsWith(CSV_SAFE_PREFIX) ? value.slice(CSV_SAFE_PREFIX.length) : value;
}

export function parseCsv(text: string, maxRows = MAX_IMPORT_ROWS + 1): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      if (rows.length > maxRows) throw new Error(`Import is limited to ${MAX_IMPORT_ROWS} sessions`);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("Unterminated quoted CSV field");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function verdict(value: unknown): ComparisonVerdict | undefined {
  return value === "left" || value === "tie" || value === "right" ? value : undefined;
}

function normalizeRecord(value: Record<string, unknown>): SessionImportRecord | null {
  const prompt = typeof value.prompt === "string" ? value.prompt.slice(0, MAX_PROMPT_CHARS) : "";
  const leftModel = typeof value.leftModel === "string" ? value.leftModel.slice(0, MAX_MODEL_CHARS) : "";
  const rightModel = typeof value.rightModel === "string" ? value.rightModel.slice(0, MAX_MODEL_CHARS) : "";
  if (!prompt.trim() || !leftModel.trim() || !rightModel.trim()) return null;

  const id = typeof value.id === "string" && value.id.length > 0 && value.id.length <= MAX_ID_CHARS
    ? value.id
    : undefined;
  const timestamp = optionalNumber(value.timestamp);
  return {
    id,
    timestamp,
    prompt,
    leftModel,
    rightModel,
    leftResponse: typeof value.leftResponse === "string"
      ? value.leftResponse.slice(0, MAX_RESPONSE_CHARS)
      : undefined,
    rightResponse: typeof value.rightResponse === "string"
      ? value.rightResponse.slice(0, MAX_RESPONSE_CHARS)
      : undefined,
    leftTimeMs: optionalNumber(value.leftTimeMs),
    rightTimeMs: optionalNumber(value.rightTimeMs),
    leftTokens: optionalNumber(value.leftTokens),
    rightTokens: optionalNumber(value.rightTokens),
    pinned: value.pinned === true || value.pinned === "yes",
    verdict: verdict(value.verdict),
  };
}

function parseJson(text: string): SessionImportRecord[] {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !("sessions" in parsed)) {
    throw new Error("JSON import must contain a sessions array");
  }
  const sessions = (parsed as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) throw new Error("JSON import must contain a sessions array");
  if (sessions.length > MAX_IMPORT_ROWS) {
    throw new Error(`Import is limited to ${MAX_IMPORT_ROWS} sessions`);
  }
  return sessions
    .filter((value): value is Record<string, unknown> => value !== null && typeof value === "object")
    .map(normalizeRecord)
    .filter((value): value is SessionImportRecord => value !== null);
}

function parseCsvSessions(text: string): SessionImportRecord[] {
  const rows = parseCsv(text);
  const headers = rows[0] ?? [];
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`Import is limited to ${MAX_IMPORT_ROWS} sessions`);
  }
  const column = (name: string, fallback: number) => {
    const index = headers.indexOf(name);
    return index >= 0 ? index : fallback;
  };
  const indexes = {
    id: column("Session ID", 0),
    timestamp: column("Timestamp", 1),
    prompt: column("Prompt", 2),
    leftModel: column("Left Model", 3),
    rightModel: column("Right Model", 4),
    leftResponse: column("Left Response", 5),
    rightResponse: column("Right Response", 6),
    leftTimeMs: column("Left Time (ms)", 7),
    rightTimeMs: column("Right Time (ms)", 8),
    leftTokens: headers.indexOf("Left Tokens"),
    rightTokens: headers.indexOf("Right Tokens"),
    pinned: column("Pinned", 9),
    verdict: headers.indexOf("Verdict"),
  };
  const get = (values: string[], index: number) =>
    index >= 0 ? decodeCsvCell(values[index] ?? "") : "";

  return rows.slice(1).map((values) => normalizeRecord({
    id: get(values, indexes.id),
    timestamp: new Date(get(values, indexes.timestamp)).getTime(),
    prompt: get(values, indexes.prompt),
    leftModel: get(values, indexes.leftModel),
    rightModel: get(values, indexes.rightModel),
    leftResponse: get(values, indexes.leftResponse),
    rightResponse: get(values, indexes.rightResponse),
    leftTimeMs: get(values, indexes.leftTimeMs),
    rightTimeMs: get(values, indexes.rightTimeMs),
    leftTokens: get(values, indexes.leftTokens),
    rightTokens: get(values, indexes.rightTokens),
    pinned: get(values, indexes.pinned),
    verdict: get(values, indexes.verdict),
  })).filter((value): value is SessionImportRecord => value !== null);
}

export function parseSessionImport(text: string, fileName: string): SessionImportRecord[] {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json")) return parseJson(text);
  if (lowerName.endsWith(".csv")) return parseCsvSessions(text);
  throw new Error("Unsupported file format");
}
