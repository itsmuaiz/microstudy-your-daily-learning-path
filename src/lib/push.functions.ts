import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        token: z.string().min(20).max(1000),
        userAgent: z.string().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").upsert(
      {
        user_id: context.userId,
        token: data.token,
        user_agent: data.userAgent ?? null,
        active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error("Apparaat opslaan mislukt.");

    await context.supabase
      .from("profiles")
      .update({ notifications_enabled: true, push_stopped: false })
      .eq("id", context.userId);

    return { ok: true };
  });

export const disablePushDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("push_devices")
      .update({ active: false })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getPushState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("push_devices")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .limit(1);
    return { enabled: (data ?? []).length > 0 };
  });
