import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  buildFarewellMail,
  buildInactiveMail,
  buildStreakMail,
  sendMicroStudyEmail,
} from "@/lib/notify.server";

export const Route = createFileRoute("/api/public/hooks/streak-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        const apikey = request.headers.get("apikey");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || (token !== expected && apikey !== expected)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? expected,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, email, display_name, streak, last_active_date, last_email_at, farewell_sent")
          .eq("notifications_enabled", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const today = new Date();
        const day = (value: string | null) =>
          value ? Math.floor((today.getTime() - new Date(value).getTime()) / 86400000) : null;

        let sent = 0;
        let failed = 0;
        for (const profile of profiles ?? []) {
          if (!profile.email) continue;
          const name = profile.display_name ?? "student";
          const inactive = day(profile.last_active_date);
          const sinceMail = day(profile.last_email_at);
          if (inactive === null || (sinceMail !== null && sinceMail < 1)) continue;

          if (inactive >= 14) {
            if (profile.farewell_sent) continue;
            const delivered = await sendMicroStudyEmail({
              to: profile.email,
              ...buildFarewellMail(name),
            });
            if (!delivered) {
              failed += 1;
              continue;
            }
            await supabase
              .from("profiles")
              .update({
                farewell_sent: true,
                notifications_enabled: false,
                last_email_at: today.toISOString(),
              })
              .eq("id", profile.id);
            sent += 1;
            continue;
          }

          let delivered = false;
          if (inactive >= 3) {
            delivered = await sendMicroStudyEmail({
              to: profile.email,
              ...buildInactiveMail(name, inactive),
            });
          } else if (inactive >= 1 && profile.streak > 0) {
            delivered = await sendMicroStudyEmail({
              to: profile.email,
              ...buildStreakMail(name, profile.streak),
            });
          } else {
            continue;
          }

          if (!delivered) {
            failed += 1;
            continue;
          }

          await supabase
            .from("profiles")
            .update({ last_email_at: today.toISOString() })
            .eq("id", profile.id);
          sent += 1;
        }

        return Response.json({ ok: true, sent, failed });

      },
    },
  },
});
