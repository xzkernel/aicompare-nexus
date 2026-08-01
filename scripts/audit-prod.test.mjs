import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { evaluateAuditReport } from "./audit-prod.mjs";

const policy = JSON.parse(readFileSync(new URL("./audit-policy.json", import.meta.url), "utf8"));

function reportWith(advisory) {
  return {
    vulnerabilities: {
      "react-router": {
        severity: advisory.severity,
        via: [advisory],
      },
      "react-router-dom": {
        severity: advisory.severity,
        via: ["react-router"],
      },
    },
  };
}

describe("production audit policy", () => {
  it("allows only the documented Router RSC advisory before expiry", () => {
    const result = evaluateAuditReport(reportWith({
      source: 1124282,
      severity: "high",
      title: "React Router RSC CSRF",
      url: "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
    }), policy, new Date("2026-08-01T00:00:00Z"));

    expect(result.ok).toBe(true);
    expect(result.summary).toEqual({ highCriticalAdvisories: 1, allowed: 1, blocked: 0 });
  });

  it("blocks every other high or critical production advisory", () => {
    const result = evaluateAuditReport(reportWith({
      source: 1,
      severity: "critical",
      title: "Unexpected advisory",
      url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
    }), policy, new Date("2026-08-01T00:00:00Z"));

    expect(result.ok).toBe(false);
    expect(result.blocked[0].id).toBe("GHSA-AAAA-BBBB-CCCC");
  });

  it("fails closed after the exception expiry date", () => {
    const result = evaluateAuditReport({ vulnerabilities: {} }, policy, new Date("2026-10-02T00:00:00Z"));
    expect(result.ok).toBe(false);
    expect(result.blocked).toContainEqual(expect.objectContaining({ id: "audit-policy-expired" }));
  });

  it("fails closed when npm reports a high package without a resolvable high advisory", () => {
    const result = evaluateAuditReport({
      vulnerabilities: {
        unexpected: { severity: "high", via: ["missing-package"] },
      },
    }, policy, new Date("2026-08-01T00:00:00Z"));
    expect(result.ok).toBe(false);
    expect(result.blocked[0].id).toBe("package:unexpected");
  });
});
