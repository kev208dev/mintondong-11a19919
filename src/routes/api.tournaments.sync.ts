import { createFileRoute } from "@tanstack/react-router";

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secretsMatch(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index]! ^ b[index]!;
  return mismatch === 0;
}

export const Route = createFileRoute("/api/tournaments/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { serverEnv } = await import("@/lib/server-env.server");
        const expected = serverEnv("TOURNAMENT_SYNC_SECRET");
        if (!expected) return Response.json({ ok: false }, { status: 503 });
        const authorization = request.headers.get("authorization") ?? "";
        const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!supplied || !(await secretsMatch(supplied, expected))) {
          return Response.json({ ok: false }, { status: 401 });
        }
        const { syncAllTournaments } = await import("@/lib/tournaments/repository.server");
        const result = await syncAllTournaments();
        return Response.json({ ok: true, sources: result });
      },
    },
  },
});
