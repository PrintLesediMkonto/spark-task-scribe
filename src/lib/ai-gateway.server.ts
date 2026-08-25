import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      const next = response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim();
      if (!runId && next) runId = next;
      return response;
    },
    getRunId: () => runId,
  };
}

export function createLovableAiGatewayProvider(lovableApiKey: string, initialRunId?: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);

  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch as typeof fetch,
  });
}

export const CHAT_MODEL = "google/gemini-3-flash";

export function gatewayErrorMessage(error: unknown): string {
  const status = (error as { statusCode?: number; status?: number })?.statusCode ??
    (error as { status?: number })?.status;
  if (status === 429) return "The AI service is busy right now. Please wait a moment and try again.";
  if (status === 402) return "AI credits are exhausted for this workspace. Add credits to continue.";
  if (status === 403) return "AI access is currently blocked for this workspace.";
  if (status === 401) return "AI is not configured correctly (missing or invalid key).";
  const message = (error as { message?: string })?.message;
  return message ? `AI request failed: ${message}` : "AI request failed. Please try again.";
}
