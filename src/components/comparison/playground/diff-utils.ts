export type DiffSegment = {
  text: string;
  divergent: boolean;
};

export type DiffResult = {
  leftSegments: DiffSegment[];
  rightSegments: DiffSegment[];
  divergenceScore: number;
  sharedLines: number;
  totalLines: number;
};

function normalizeLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Line-level diff for live divergence highlighting (presentational only). */
export function computeResponseDiff(left: string, right: string): DiffResult {
  const leftLines = normalizeLines(left);
  const rightLines = normalizeLines(right);
  const rightSet = new Set(rightLines.map((l) => l.toLowerCase()));
  const leftSet = new Set(leftLines.map((l) => l.toLowerCase()));

  let shared = 0;
  leftLines.forEach((l) => {
    if (rightSet.has(l.toLowerCase())) shared += 1;
  });

  const total = Math.max(leftLines.length, rightLines.length, 1);
  const divergenceScore = Math.round((1 - shared / total) * 100);

  return {
    leftSegments: leftLines.map((text) => ({
      text,
      divergent: !rightSet.has(text.toLowerCase()),
    })),
    rightSegments: rightLines.map((text) => ({
      text,
      divergent: !leftSet.has(text.toLowerCase()),
    })),
    divergenceScore,
    sharedLines: shared,
    totalLines: total,
  };
}

export function splitReasoningSections(text: string): { reasoning: string; body: string } {
  const match = text.match(/^(reasoning:?\s*[\s\S]*?)(?=\n\n|\n(?=[A-Z][a-z]+:)|$)/i);
  if (!match) return { reasoning: "", body: text };
  const reasoning = match[1].trim();
  const body = text.slice(reasoning.length).trim();
  return { reasoning, body: body || text };
}
