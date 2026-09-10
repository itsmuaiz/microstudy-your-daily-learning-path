import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Zap, LogOut, Bell, BellOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { enablePush, pushStatusMessage } from "@/lib/push";
import { disablePushDevices, getPushState } from "@/lib/push.functions";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { crossFade, springCalm } from "@/lib/motion";
import { NotifyPrefsPanel } from "./NotifyPrefsPanel";
import { Pressable } from "./Pressable";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, xp, streak, notifications_enabled")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const reduced = useReducedMotion();

  const { data: pushState } = useQuery({
    queryKey: ["push-state", user?.id],
    enabled: !!user,
    queryFn: () => getPushState(),
  });
  const pushOn = !!pushState?.enabled;

  async function togglePush() {
    setPushBusy(true);
    setPushNote(null);
    if (pushOn) {
      await disablePushDevices();
      setPushNote("Meldingen staan uit op dit apparaat.");
    } else {
      const status = await enablePush();
      setPushNote(pushStatusMessage[status]);
    }
    await queryClient.invalidateQueries({ queryKey: ["push-state"] });
    setPushBusy(false);
  }

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-5">
          <Link to="/leerpad" className="text-[17px] font-semibold tracking-tight">
            MicroStudy
          </Link>
          <nav className="flex items-center gap-1 text-[15px]">
            <Link
              to="/leerpad"
              className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Leerpad
            </Link>
            <Link
              to="/groepen"
              className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Groepen
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span
              className="flex items-center gap-1.5 text-[15px] font-semibold text-streak"
              title="Streak in dagen"
            >
              <Flame className="size-4" aria-hidden />
              <span className="numeric-display">{profile?.streak ?? 0}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[15px] font-semibold text-xp" title="XP">
              <Zap className="size-4" aria-hidden />
              <span className="numeric-display">{profile?.xp ?? 0}</span>
            </span>
            <div className="relative">
              <Pressable
                aria-label="Meldingen"
                aria-expanded={panelOpen}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => setPanelOpen((v) => !v)}
              >
                {pushOn ? (
                  <Bell className="size-4 text-primary" aria-hidden />
                ) : (
                  <BellOff className="size-4" aria-hidden />
                )}
              </Pressable>
              <AnimatePresence>
                {panelOpen && (
                  <motion.div
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                    transition={reduced ? crossFade : springCalm}
                    className="glass absolute right-0 top-11 z-50 w-[320px] rounded-3xl border border-border p-4 shadow-xl"
                  >
                    <p className="text-[15px] font-semibold">Meldingen</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      Maximaal één bericht per dag, alleen als het zin heeft.
                    </p>
                    <Pressable
                      disabled={pushBusy}
                      onClick={() => void togglePush()}
                      className={`mt-3 w-full rounded-xl px-4 py-2.5 text-[15px] font-semibold ${
                        pushOn
                          ? "border border-border bg-secondary text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {pushBusy
                        ? "Even bezig…"
                        : pushOn
                          ? "Meldingen uitzetten op dit apparaat"
                          : "Meldingen aanzetten"}
                    </Pressable>
                    {pushNote && (
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                        {pushNote}
                      </p>
                    )}
                    <p className="mt-4 mb-2 text-[13px] font-semibold text-muted-foreground">
                      Waarover wil je berichten krijgen?
                    </p>
                    <NotifyPrefsPanel prefs={pushState?.prefs} disabled={!pushOn} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Pressable
              aria-label="Uitloggen"
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={async () => {
                await signOut();
                navigate({ to: "/inloggen" });
              }}
            >
              <LogOut className="size-4" aria-hidden />
            </Pressable>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
