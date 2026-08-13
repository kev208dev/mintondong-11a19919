import { serverEnv } from "@/lib/server-env.server";

const USER_AGENT =
  "MintondongTournamentCollector/1.0 (+https://mintondong-11a19919.kev208dev.workers.dev)";

export class SourceDisabledError extends Error {
  constructor(source: string) {
    super(`${source}_SOURCE_DISABLED`);
    this.name = "SourceDisabledError";
  }
}

export function sourceEnabled(name: "FACECOCK" | "COURTX"): boolean {
  return serverEnv(`TOURNAMENT_${name}_ENABLED`) === "true";
}

export async function fetchSourceHtml(url: string, timeoutMs = 12_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": USER_AGENT,
      },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
    if (/cf-chl-|enable javascript and cookies to continue/i.test(body)) {
      throw new Error("SOURCE_AUTOMATION_CHALLENGE");
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
