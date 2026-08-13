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
    z.object({ confirmation: z.literal(ACCOUNT_DELETION_CONFIRMATION) }).parse(value),
  )
  .handler(async ({ context }) => {
    const { deleteCurrentAccount } = await import("./account-deletion.server");
    return deleteCurrentAccount(context.userId);
  });
