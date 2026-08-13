import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { env as cloudflareEnv } from "cloudflare:workers";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

type WorkerVersionMetadata = {
  id?: string;
};

const nativeReleaseMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = result.response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return result;

  const headers = new Headers(response.headers);
  // Capacitor loads the production origin. Never reuse an old app document;
  // fingerprinted JS/CSS assets keep their normal immutable caching.
  headers.set("Cache-Control", "no-store");
  const versionId = (cloudflareEnv["CF_VERSION_METADATA"] as WorkerVersionMetadata | undefined)?.id;
  if (versionId) headers.set("X-Mintondong-Worker-Version", versionId);
  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [nativeReleaseMiddleware, errorMiddleware, csrfMiddleware],
}));
