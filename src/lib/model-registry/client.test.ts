import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchModelRegistry,
  getCachedRegistry,
  invalidateModelRegistry,
} from "./client";

function registryResponse(fingerprint: string): Response {
  return new Response(JSON.stringify({
    version: "2",
    fingerprint,
    providers: [],
    degraded: false,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("model registry request sequencing", () => {
  beforeEach(() => invalidateModelRegistry());
  afterEach(() => vi.unstubAllGlobals());

  it("does not let an older forced response replace a newer snapshot", async () => {
    const older = deferred<Response>();
    const newer = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    vi.stubGlobal("fetch", fetchMock);

    const olderRequest = fetchModelRegistry(true);
    const newerRequest = fetchModelRegistry(true);
    newer.resolve(registryResponse("newer"));
    await newerRequest;
    older.resolve(registryResponse("older"));
    await olderRequest;

    expect(getCachedRegistry()?.fingerprint).toBe("newer");
  });

  it("keeps the last good snapshot when a forced refresh fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(registryResponse("last-good"))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchModelRegistry(true);
    const refreshed = await fetchModelRegistry(true);

    expect(refreshed.fingerprint).toBe("last-good");
    expect(getCachedRegistry()?.fingerprint).toBe("last-good");
  });
});
