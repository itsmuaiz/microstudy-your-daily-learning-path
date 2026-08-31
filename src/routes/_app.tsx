import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/../integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/inloggen" });
  }, [loading, session, navigate]);

  const onboarding = useQuery({
    queryKey: ["onboarding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.onboarded_at ?? null;
    },
  });

  const needsOnboarding = onboarding.isSuccess && onboarding.data === null;

  useEffect(() => {
    if (needsOnboarding && pathname !== "/welkom") navigate({ to: "/welkom" });
  }, [needsOnboarding, pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[15px] text-muted-foreground">
        Even laden…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
