import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Flame, ListChecks, Users, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { pick, springCalm } from "@/lib/motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MicroStudy — leerpaden voor je toets" },
      {
        name: "description",
        content:
          "MicroStudy maakt van jouw studiestof een leerpad met dagelijkse stappen, AI-vragen, streaks en een XP-leaderboard voor je groep.",
      },
      { property: "og:title", content: "MicroStudy — leerpaden voor je toets" },
      {
        property: "og:description",
        content:
          "Upload je stof, geef aan hoeveel tijd je hebt en leer elke dag één stap tot de toets.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/leerpad" });
  }, [loading, session, navigate]);

  const features = [
    {
      icon: ListChecks,
      title: "Leerpad",
      body: "Je stof wordt verdeeld over de dagen tot je toets. Elke dag ontgrendelt één stap.",
    },
    {
      icon: Zap,
      title: "Nieuwe vragen per sessie",
      body: "Elke stap heeft verse AI-vragen over precies dat deel van de stof.",
    },
    {
      icon: Flame,
      title: "Streak",
      body: "Elke dag geleerd houdt je streak in leven — mét herinnering per mail.",
    },
    {
      icon: Users,
      title: "Groepen",
      body: "Nodig klasgenoten uit en strijd op XP in het leaderboard van je groep.",
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-5">
          <span className="text-[17px] font-semibold tracking-tight">MicroStudy</span>
          <Link
            to="/inloggen"
            className="ml-auto rounded-full bg-primary px-4 py-2 text-[15px] font-semibold text-primary-foreground"
          >
            Inloggen
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-20">
        <motion.section
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pick(reduced, springCalm)}
        >
          <h1 className="max-w-2xl text-6xl font-bold">Van stof naar leerpad. In één minuut.</h1>
          <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
            Zet je samenvatting erin, zeg hoeveel dagen je hebt tot de toets, en MicroStudy verdeelt
            alles in dagelijkse stappen met nieuwe vragen.
          </p>
          <Link
            to="/inloggen"
            className="mt-8 inline-flex rounded-2xl bg-primary px-6 py-3.5 text-[17px] font-semibold text-primary-foreground"
          >
            Start je leerpad
          </Link>
        </motion.section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-border bg-card p-6">
              <feature.icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
