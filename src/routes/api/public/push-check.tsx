import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { decidePush, sendPush, type PushUserContext } from "@/lib/push.server";

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string | null, now: Date) {
  if (!from) return 999;
  return Math.floor((now.getTime() - new Date(from).getTime()) / DAY);
}

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: devices, error } = await supabaseAdmin
    .from("push_devices")
    .select("id, user_id, token")
    .eq("active", true);
  if (error) throw new Error(error.message);

  const byUser = new Map<string, { id: string; token: string }[]>();
  for (const device of devices ?? []) {
    const list = byUser.get(device.user_id) ?? [];
    list.push({ id: device.id, token: device.token });
    byUser.set(device.user_id, list);
  }

  let sent = 0;
  let skipped = 0;
  let stopped = 0;

  for (const [userId, tokens] of byUser) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, display_name, xp, streak, last_active_date, notifications_enabled, last_push_at, push_stopped, goal, daily_minutes, notify_study, notify_streak, notify_leaderboard, notify_inactivity",
      )
      .eq("id", userId)
      .single();
    if (!profile || !profile.notifications_enabled || profile.push_stopped) {
      skipped++;
      continue;
    }

    // Nooit meer dan één melding per dag.
    if (profile.last_push_at && profile.last_push_at.slice(0, 10) === today) {
      skipped++;
      continue;
    }

    const allowedTopics = [
      profile.notify_study ? "study" : null,
      profile.notify_streak ? "streak" : null,
      profile.notify_leaderboard ? "leaderboard" : null,
      profile.notify_inactivity ? "inactivity" : null,
    ].filter((t): t is string => !!t);

    if (allowedTopics.length === 0) {
      skipped++;
      continue;
    }

    const daysInactive = daysBetween(profile.last_active_date, now);

    const deliver = async (title: string, body: string) => {
      let delivered = false;
      for (const device of tokens) {
        const result = await sendPush(device.token, title, body);
        if (result.ok) delivered = true;
        if (result.stale) {
          await supabaseAdmin.from("push_devices").update({ active: false }).eq("id", device.id);
        }
      }
      return delivered;
    };

    // Langdurige inactiviteit: één laatste melding, daarna stoppen.
    if (daysInactive >= 14) {
      if (!profile.notify_inactivity) {
        await supabaseAdmin.from("profiles").update({ push_stopped: true }).eq("id", userId);
        stopped++;
        continue;
      }
      await deliver(
        "Laatste herinnering",
        "Je hebt MicroStudy 2 weken niet gebruikt. Dit is onze laatste melding — open de app wanneer je weer wilt leren.",
      );
      await supabaseAdmin
        .from("profiles")
        .update({ push_stopped: true, last_push_at: now.toISOString() })
        .eq("id", userId);
      stopped++;
      continue;
    }

    const { data: paths } = await supabaseAdmin
      .from("study_paths")
      .select("id, exam_date")
      .eq("user_id", userId);

    const { data: steps } = await supabaseAdmin
      .from("path_steps")
      .select("id, unlock_date, completed_at")
      .eq("user_id", userId)
      .is("completed_at", null);

    const openSteps = (steps ?? []).length;
    const stepDueToday = (steps ?? []).some((s) => s.unlock_date <= today);

    const examDates = (paths ?? [])
      .map((p) => p.exam_date)
      .filter((d): d is string => !!d && d >= today)
      .sort();
    const nextExamDate = examDates[0] ?? null;

    // Leaderboard-context: in welke groepen zit de gebruiker en wie staat boven hem?
    let groupCount = 0;
    let bestGroupRank: number | null = null;
    let peersAhead = 0;
    if (profile.notify_leaderboard) {
      const { data: myGroups } = await supabaseAdmin
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      const groupIds = (myGroups ?? []).map((g) => g.group_id);
      groupCount = groupIds.length;
      if (groupIds.length > 0) {
        const { data: peers } = await supabaseAdmin
          .from("group_members")
          .select("user_id, group_id")
          .in("group_id", groupIds);
        const peerIds = [...new Set((peers ?? []).map((p) => p.user_id))].filter(
          (id) => id !== userId,
        );
        if (peerIds.length > 0) {
          const { data: peerProfiles } = await supabaseAdmin
            .from("profiles")
            .select("id, xp")
            .in("id", peerIds);
          peersAhead = (peerProfiles ?? []).filter((p) => p.xp > profile.xp).length;
          bestGroupRank = peersAhead + 1;
        } else {
          bestGroupRank = 1;
        }
      }
    }

    const ctx: PushUserContext = {
      allowedTopics,
      groupCount,
      bestGroupRank,
      peersAhead,
      displayName: profile.display_name ?? "student",
      streak: profile.streak,
      xp: profile.xp,
      lastActiveDate: profile.last_active_date,
      daysInactive,
      daysSinceLastPush: profile.last_push_at ? daysBetween(profile.last_push_at, now) : null,
      goal: profile.goal,
      dailyMinutes: profile.daily_minutes,
      openSteps,
      stepDueToday,
      nextExamDate,
      daysToExam: nextExamDate
        ? Math.round((new Date(nextExamDate).getTime() - now.getTime()) / DAY)
        : null,
    };

    if (openSteps === 0 && !nextExamDate && profile.streak === 0) {
      skipped++;
      continue;
    }

    let decision;
    try {
      decision = await decidePush(ctx);
    } catch (aiError) {
      console.error("Push-beslissing mislukt", aiError);
      skipped++;
      continue;
    }

    if (!decision.send) {
      skipped++;
      continue;
    }

    const delivered = await deliver(decision.title, decision.body);
    if (delivered) {
      await supabaseAdmin
        .from("profiles")
        .update({ last_push_at: now.toISOString() })
        .eq("id", userId);
      sent++;
    } else {
      skipped++;
    }
  }

  return { users: byUser.size, sent, skipped, stopped };
}

export const Route = createFileRoute("/api/public/push-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        const header = request.headers.get("authorization") ?? "";
        const ownSecretOk = !!secret && header === `Bearer ${secret}`;
        if (!ownSecretOk) {
          const unauthorized = await authenticateCronRequest(request);
          if (unauthorized) return unauthorized;
        }
        try {
          return Response.json(await run());
        } catch (error) {
          console.error("push-check mislukt", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "onbekend" },
            { status: 500 },
          );
        }
      },
    },
  },
});
