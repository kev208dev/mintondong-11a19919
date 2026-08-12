import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/portone/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        try {
          const { synchronizePayment, webhookPaymentId } =
            await import("@/lib/portone/portone.server");
          const paymentId = await webhookPaymentId(rawBody, request.headers);
          await synchronizePayment(paymentId);
          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "WEBHOOK_FAILED";
          if (message === "ORDER_NOT_FOUND") return Response.json({ ok: true });
          const badRequest = message.startsWith("INVALID_") || error instanceof SyntaxError;
          console.error("[portone-webhook]", message);
          return Response.json({ ok: false }, { status: badRequest ? 400 : 500 });
        }
      },
    },
  },
});
