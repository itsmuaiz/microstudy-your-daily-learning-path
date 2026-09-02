import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm } from "@/lib/motion";

export const Route = createFileRoute("/inloggen")({
  head: () => ({
    meta: [
      { title: "Inloggen — MicroStudy" },
      {
        name: "description",
        content:
          "Log in op MicroStudy of maak een account met e-mail en wachtwoord om je leerpad te volgen.",
      },
      { property: "og:title", content: "Inloggen — MicroStudy" },
      {
        property: "og:description",
        content: "Log in op MicroStudy en ga verder met je leerpad, streak en XP.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (session) navigate({ to: "/leerpad" });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/wachtwoord-herstellen`,
        });
        if (error) throw error;
        toast.success("Check je mail: we hebben je een reset-link gestuurd.");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/leerpad" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/leerpad`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account aangemaakt. Veel succes!");
          navigate({ to: "/welkom" });
        } else {
          toast.success("Bijna klaar: bevestig je e-mailadres via de link in je mail.");
          setMode("login");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inloggen mislukt");
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
        <h1 className="mt-5 text-3xl font-bold">
          {mode === "login"
            ? "Welkom terug"
            : mode === "register"
              ? "Maak je account"
              : "Wachtwoord vergeten"}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {mode === "login"
            ? "Log in met je e-mailadres en wachtwoord."
            : mode === "register"
              ? "Registreer met e-mail en wachtwoord en start je eerste leerpad."
              : "Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold">
                Naam
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Hoe heet je?"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          )}
          <Pressable
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-[16px] font-semibold text-primary-foreground"
          >
            {busy
              ? "Bezig…"
              : mode === "login"
                ? "Inloggen"
                : mode === "register"
                  ? "Account maken"
                  : "Stuur reset-link"}
          </Pressable>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="mt-5 block text-[15px] font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Wachtwoord vergeten?
          </button>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-3 text-[15px] font-medium text-accent underline-offset-4 hover:underline"
        >
          {mode === "login"
            ? "Nog geen account? Registreren"
            : mode === "register"
              ? "Al een account? Inloggen"
              : "Terug naar inloggen"}
        </button>
      </motion.div>
    </div>
  );
}
