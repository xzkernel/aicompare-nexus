import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPolicyPath = path.join(scriptDir, "audit-policy.json");

function advisoryId(advisory) {
  const match = typeof advisory.url === "string"
    ? advisory.url.match(/GHSA-[a-z0-9-]+$/i)
    : null;
  return match?.[0].toUpperCase() ?? `source-${advisory.source ?? "unknown"}`;
}

function advisoriesForPackage(report, packageName, visited = new Set()) {
  if (visited.has(packageName)) return [];
  visited.add(packageName);
  const vulnerability = report.vulnerabilities?.[packageName];
  if (!vulnerability) return [];
  return (vulnerability.via ?? []).flatMap((entry) =>
    typeof entry === "string"
      ? advisoriesForPackage(report, entry, visited)
      : [{ advisory: entry, packageName }]
  );
}

export function evaluateAuditReport(report, policy, now = new Date()) {
  const expiresAt = Date.parse(`${policy.expires}T23:59:59.999Z`);
  const policyActive = Number.isFinite(expiresAt) && now.getTime() <= expiresAt;
  const allowedById = new Map(
    (policy.allowedAdvisories ?? []).map((entry) => [entry.id.toUpperCase(), entry])
  );
  const findings = new Map();

  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    if (vulnerability.severity !== "high" && vulnerability.severity !== "critical") continue;
    const advisories = advisoriesForPackage(report, packageName);
    const relevantAdvisories = advisories.filter(({ advisory }) =>
      advisory.severity === "high" || advisory.severity === "critical"
    );
    if (relevantAdvisories.length === 0) {
      findings.set(`package:${packageName}`, {
        id: `package:${packageName}`,
        package: packageName,
        severity: vulnerability.severity,
        title: "Unresolved high/critical package vulnerability",
      });
      continue;
    }
    for (const { advisory, packageName: advisoryPackage } of relevantAdvisories) {
      const id = advisoryId(advisory);
      if (findings.has(id)) continue;
      findings.set(id, {
        id,
        package: advisoryPackage,
        severity: advisory.severity,
        title: advisory.title,
        url: advisory.url,
      });
    }
  }

  const allowed = [];
  const blocked = [];
  for (const finding of findings.values()) {
    const exception = allowedById.get(finding.id);
    if (
      policyActive &&
      exception &&
      exception.severity === finding.severity &&
      exception.package === finding.package
    ) {
      allowed.push({ ...finding, expires: policy.expires, rationale: exception.rationale });
    } else {
      blocked.push(finding);
    }
  }

  if (!policyActive) {
    blocked.push({
      id: "audit-policy-expired",
      severity: "high",
      title: `Audit exception policy expired on ${policy.expires}`,
    });
  }

  return {
    ok: blocked.length === 0,
    policy: {
      version: policy.version,
      expires: policy.expires,
      active: policyActive,
    },
    summary: {
      highCriticalAdvisories: findings.size,
      allowed: allowed.length,
      blocked: blocked.length,
    },
    allowed,
    blocked,
  };
}

export function runProductionAudit() {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = npmCli
    ? [npmCli, "audit", "--omit=dev", "--json"]
    : ["audit", "--omit=dev", "--json"];
  const audit = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
  if (!audit.stdout?.trim()) {
    throw new Error(`npm audit produced no JSON output: ${audit.stderr?.trim() || "unknown error"}`);
  }
  const report = JSON.parse(audit.stdout);
  const policy = JSON.parse(readFileSync(defaultPolicyPath, "utf8"));
  return evaluateAuditReport(report, policy);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  try {
    const result = runProductionAudit();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exitCode = 1;
  }
}
