import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm } from "@/lib/motion";

export const Route = createFileRoute("/wachtwoord-herstellen")({
  head: () => ({
    meta: [
      { title: "Nieuw wachtwoord instellen — MicroStudy" },
      {
        name: "description",
        content:
          "Stel via je reset-link een nieuw wachtwoord in voor je MicroStudy-account en ga verder met je leerpad.",
      },
      { property: "og:title", content: "Nieuw wachtwoord instellen — MicroStudy" },
      {
        property: "og:description",
        content: "Kies een nieuw wachtwoord voor je MicroStudy-account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("De wachtwoorden zijn niet gelijk.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Je wachtwoord is aangepast.");
      navigate({ to: "/leerpad" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Wachtwoord bijwerken mislukt",
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-[16px] outline-none transition-shadow focus:ring-2 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={pick(reduced, springCalm)}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[0_20px_60px_-30px_oklch(0.2_0.03_260/0.35)]"
      >
        <Link to="/" className="text-[15px] font-semibold tracking-tight">
          MicroStudy
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Nieuw wachtwoord</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {ready
            ? "Kies een nieuw wachtwoord van minimaal 6 tekens."
            : "Open deze pagina via de reset-link in je e-mail om een nieuw wachtwoord te kiezen."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
              Nieuw wachtwoord
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-semibold">
              Bevestig wachtwoord
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <Pressable
            type="submit"
            disabled={busy || !ready}
            className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Bezig…" : "Wachtwoord opslaan"}
          </Pressable>
        </form>

        <Link
          to="/inloggen"
          className="mt-5 inline-block text-[15px] font-medium text-accent underline-offset-4 hover:underline"
        >
          Terug naar inloggen
        </Link>
      </motion.div>
    </div>
  );
}
