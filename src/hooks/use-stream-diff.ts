import { useEffect, useMemo, useState } from "react";
import { computeResponseDiff, type DiffResult } from "@/components/comparison/playground/diff-utils";

const EMPTY_DIFF: DiffResult = {
  leftSegments: [],
  rightSegments: [],
  divergenceScore: 0,
  sharedLines: 0,
  totalLines: 0,
};

/**
 * Debounced line-level diff — avoids recomputing on every token.
 */
export function useStreamDiff(
  leftText: string,
  rightText: string,
  enabled: boolean,
  debounceMs = 200
): DiffResult {
  const [debouncedLeft, setDebouncedLeft] = useState(leftText);
  const [debouncedRight, setDebouncedRight] = useState(rightText);

  useEffect(() => {
    if (!enabled) {
      setDebouncedLeft(leftText);
      setDebouncedRight(rightText);
      return;
    }
    const id = window.setTimeout(() => {
      setDebouncedLeft(leftText);
      setDebouncedRight(rightText);
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [leftText, rightText, enabled, debounceMs]);

  return useMemo(() => {
    if (!debouncedLeft.trim() && !debouncedRight.trim()) return EMPTY_DIFF;
    if (!debouncedLeft.trim() || !debouncedRight.trim()) return EMPTY_DIFF;
    return computeResponseDiff(debouncedLeft, debouncedRight);
  }, [debouncedLeft, debouncedRight]);
}
