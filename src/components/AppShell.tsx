import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Zap, LogOut, Bell, BellOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { enablePush, pushStatusMessage } from "@/lib/push";
import { disablePushDevices, getPushState } from "@/lib/push.functions";
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
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();

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
