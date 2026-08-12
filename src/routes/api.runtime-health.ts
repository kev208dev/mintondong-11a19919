import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/lib/server-env.server";

export const Route = createFileRoute("/api/runtime-health")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(serverEnv("SUPABASE_SERVICE_ROLE_KEY"));
        return Response.json(
          { ok: true, supabaseAdminConfigured: configured },
          {
            headers: {
              "cache-control": "no-store",
              "content-type": "application/json; charset=utf-8",
            },
          },
        );
      },
    },
  },
});
