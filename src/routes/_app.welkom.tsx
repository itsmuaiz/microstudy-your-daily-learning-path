import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Flame, GraduationCap, Sparkles, Upload, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { crossFade, pick, springCalm } from "@/lib/motion";

export const Route = createFileRoute("/_app/welkom")({
  head: () => ({
    meta: [
      { title: "Welkom bij MicroStudy" },
      {
        name: "description",
        content:
          "Zo werkt MicroStudy: stof uploaden, AI maakt je leerpad, elke dag één stap, XP en streaks opbouwen.",
      },
      { property: "og:title", content: "Welkom bij MicroStudy" },
      {
        property: "og:description",
        content: "Een korte introductie voordat je je eerste leerset toevoegt.",
      },
    ],
  }),
  component: Welkom,
});

const levelGroups = [
  {
    label: "Basisschool",
    options: ["Basisschool"],
  },
  {
    label: "Voortgezet onderwijs — onderbouw",
    options: ["Onderbouw vmbo", "Onderbouw havo", "Onderbouw vwo"],
  },
  {
    label: "Voortgezet onderwijs — bovenbouw",
    options: ["Bovenbouw vmbo", "Bovenbouw havo", "Bovenbouw vwo"],
  },
  {
    label: "Na het voortgezet onderwijs",
    options: ["Mbo", "Hbo", "Universiteit"],
  },
];

const steps = [
  {
    icon: Upload,
    title: "Zet je stof erin",
    body: "Upload je samenvatting of plak je tekst. Eén bestand of een hoofdstuk is genoeg om te beginnen.",
  },
  {
    icon: CalendarClock,
    title: "Vertel hoeveel tijd je hebt",
    body: "Geef aan hoeveel dagen je nog hebt tot de toets. MicroStudy verdeelt de stof gelijkmatig over die dagen.",
  },
  {
    icon: Sparkles,
    title: "Elke dag één stap",
    body: "Je leerpad ontgrendelt dagelijks een nieuwe stap met AI-vragen over precies die stof — tot je de hele set door hebt.",
  },
  {
    icon: Flame,
    title: "XP en streak",
    body: "Elke afgeronde stap geeft XP en houdt je streak in leven. Je ziet altijd wat je vandaag nog moet doen.",
  },
  {
    icon: Users,
    title: "Groepen (optioneel)",
    body: "Maak een groep, deel de code met klasgenoten en vergelijk je XP op het leaderboard.",
  },
  {
    icon: GraduationCap,
    title: "Op welk niveau leer je?",
    body: "MicroStudy gebruikt dit als standaard voor de taal en diepgang van je vragen. Je kunt het later altijd aanpassen.",
    picker: true as const,
  },
];

function Welkom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<string | null>(null);

  const step = steps[index]!;
  const Icon = step.icon;
  const last = index === steps.length - 1;

  async function finish() {
    setSaving(true);
    if (user) {
      await supabase
        .from("profiles")
        .update({
          onboarded_at: new Date().toISOString(),
          ...(level ? { education_level: level } : {}),
        })
        .eq("id", user.id);
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
    navigate({ to: "/leerpad" });
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Welkom bij MicroStudy
        </p>
        <h1 className="mt-1 text-4xl font-bold leading-[1.05] tracking-[-0.02em]">
          Zo ziet leren met MicroStudy eruit
        </h1>
      </header>

      <motion.section
        layout
        transition={pick(reduced, springCalm)}
        className="rounded-3xl border border-border bg-card p-8"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reduced ? crossFade : springCalm}
          >
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Icon className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.01em]">{step.title}</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{step.body}</p>

            {"picker" in step && step.picker && (
              <div className="mt-6 space-y-5">
                {levelGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const active = level === option;
                        return (
                          <Pressable
                            key={option}
                            scale={0.98}
                            onClick={() => setLevel(option)}
                            className={`rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-secondary text-foreground"
                            }`}
                          >
                            {option}
                          </Pressable>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-2" aria-hidden>
          {steps.map((s, i) => (
            <motion.span
              key={s.title}
              initial={false}
              animate={{ width: i === index ? 28 : 8, opacity: i <= index ? 1 : 0.35 }}
              transition={pick(reduced, springCalm)}
              className="h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Pressable
            disabled={saving || (last && !level)}
            onClick={() => (last ? void finish() : setIndex((i) => i + 1))}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[16px] font-semibold text-primary-foreground"
          >
            {last
              ? level
                ? "Mijn eerste leerset toevoegen"
                : "Kies je niveau"
              : "Verder"}
          </Pressable>
          {index > 0 && (
            <Pressable
              onClick={() => setIndex((i) => i - 1)}
              className="rounded-xl px-4 py-3 text-[15px] font-semibold text-muted-foreground"
            >
              Terug
            </Pressable>
          )}
          {!last && (
            <Pressable
              disabled={saving}
              onClick={() => void finish()}
              className="rounded-xl px-4 py-3 text-[15px] font-semibold text-muted-foreground"
            >
              Overslaan
            </Pressable>
          )}
        </div>
      </motion.section>

      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Stap {index + 1} van {steps.length} · daarna kom je direct in het scherm waar je stof
        uploadt en aangeeft hoeveel dagen je hebt tot de toets.
      </p>
    </div>
  );
}
