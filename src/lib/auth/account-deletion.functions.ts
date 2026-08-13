import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ACCOUNT_DELETION_CONFIRMATION } from "./account-deletion-core";

export const getMyAccountDeletionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccountDeletionStatus } = await import("./account-deletion.server");
    return getAccountDeletionStatus(context.userId);
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((value) =>
    z
      .object({
        confirmation: z.literal(ACCOUNT_DELETION_CONFIRMATION),
        appleProviderToken: z.string().trim().min(20).max(8192).optional(),
      })
      .parse(value),
  )
  .handler(async ({ context, data }) => {
    const { deleteCurrentAccount } = await import("./account-deletion.server");
    return deleteCurrentAccount(context.userId, data.appleProviderToken);
  });
