import type { ProviderId } from "@/config/providers";

import { resolveProviderForSlot, type ResolvedProvider } from "@/lib/compare-request";

import { buildStaticSearchCapability } from "@/lib/search-capability-state";

import type { SearchMode } from "@/lib/search-metadata";

import type { ApiKeys } from "@/lib/secure-api-keys";
import { MAX_PROMPT_CHARS } from "@/lib/session-import";



export type CompareExecutionState = {

  runnable: boolean;

  /** i18n key under compare.blocking.* */

  blockingReason?: string | null;

  /** i18n keys under compare.warnings.* */

  warnings: string[];

  leftResolved: ResolvedProvider | null;

  rightResolved: ResolvedProvider | null;

};



export type CompareExecutionInput = {

  prompt: string;

  leftModel: string;

  rightModel: string;

  isComparing: boolean;

  searchMode: SearchMode;

  apiKeys: ApiKeys;

  getApiKey: (id: ProviderId) => string | null;

};



function parseModelSlot(model: string): { providerId: string; modelId: string } | null {

  const colon = model.indexOf(":");

  if (colon <= 0) return null;

  const providerId = model.slice(0, colon);

  const modelId = model.slice(colon + 1).trim();

  if (!providerId || !modelId) return null;

  return { providerId, modelId };

}



function collectSearchWarnings(

  leftProviderId: string,

  rightProviderId: string,

  leftRoute: string | undefined,

  rightRoute: string | undefined,

  searchMode: SearchMode

): string[] {

  if (searchMode === "off") return [];



  const warnings: string[] = [];

  const leftCap = buildStaticSearchCapability(leftProviderId, leftRoute, searchMode);

  const rightCap = buildStaticSearchCapability(rightProviderId, rightRoute, searchMode);



  if (leftCap.supported !== rightCap.supported) {

    warnings.push("compare.warnings.searchDiffers");

  } else if (!leftCap.supported && !rightCap.supported) {

    warnings.push("compare.warnings.noSearch");

  }



  if (searchMode === "force") {

    if (leftCap.requested && !leftCap.supported) {

      warnings.push("compare.warnings.forceSearchA");

    }

    if (rightCap.requested && !rightCap.supported) {

      warnings.push("compare.warnings.forceSearchB");

    }

  }



  return warnings;

}



/** Derive compare CTA readiness — warnings never block execution. */

export function deriveCompareExecutionState(input: CompareExecutionInput): CompareExecutionState {

  const { prompt, leftModel, rightModel, isComparing, searchMode, apiKeys, getApiKey } = input;



  const warnings: string[] = [];

  const leftSlot = parseModelSlot(leftModel);

  const rightSlot = parseModelSlot(rightModel);



  const leftResolved = leftSlot

    ? resolveProviderForSlot(leftSlot.providerId, leftSlot.modelId, apiKeys, getApiKey)

    : null;

  const rightResolved = rightSlot

    ? resolveProviderForSlot(rightSlot.providerId, rightSlot.modelId, apiKeys, getApiKey)

    : null;



  if (leftSlot && rightSlot) {

    warnings.push(

      ...collectSearchWarnings(

        leftSlot.providerId,

        rightSlot.providerId,

        leftResolved?.name,

        rightResolved?.name,

        searchMode

      )

    );

  }



  if (isComparing) {

    return {

      runnable: false,

      blockingReason: "compare.blocking.inProgress",

      warnings,

      leftResolved: leftResolved,

      rightResolved: rightResolved,

    };

  }



  if (!prompt.trim()) {

    return {

      runnable: false,

      blockingReason: "compare.blocking.enterPrompt",

      warnings,

      leftResolved,

      rightResolved,

    };

  }

  if (prompt.length > MAX_PROMPT_CHARS) {
    return {
      runnable: false,
      blockingReason: "compare.blocking.promptTooLong",
      warnings,
      leftResolved,
      rightResolved,
    };
  }



  if (!leftSlot) {

    return {

      runnable: false,

      blockingReason: "compare.blocking.selectModelA",

      warnings,

      leftResolved: null,

      rightResolved,

    };

  }



  if (!rightSlot) {

    return {

      runnable: false,

      blockingReason: "compare.blocking.selectModelB",

      warnings,

      leftResolved,

      rightResolved: null,

    };

  }



  if (!leftResolved) {

    warnings.push("compare.warnings.noKeyA");

  }

  if (!rightResolved) {

    warnings.push("compare.warnings.noKeyB");

  }



  if (!leftResolved && !rightResolved) {

    return {

      runnable: false,

      blockingReason: "compare.blocking.addKeys",

      warnings,

      leftResolved,

      rightResolved,

    };

  }



  return {

    runnable: true,

    blockingReason: null,

    warnings,

    leftResolved,

    rightResolved,

  };

}


