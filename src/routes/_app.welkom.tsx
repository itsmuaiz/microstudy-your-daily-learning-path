import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CalendarClock,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  Timer,
  Upload,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { crossFade, pick, springCalm } from "@/lib/motion";
import { enablePush, pushStatusMessage, type PushStatus } from "@/lib/push";

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
    picker: "level" as const,
  },
  {
    icon: Target,
    title: "Wat wil je bereiken met MicroStudy?",
    body: "Zo weet MicroStudy waar je vragen en tempo op gericht moeten zijn.",
    picker: "goal" as const,
  },
  {
    icon: Timer,
    title: "Hoeveel wil je per dag leren?",
    body: "MicroStudy verdeelt je stof zo dat een dagelijkse stap ongeveer deze tijd kost.",
    picker: "minutes" as const,
  },
  {
    icon: BellRing,
    title: "Wil je een herinnering krijgen?",
    body: "MicroStudy stuurt maximaal één melding per dag, alleen als het echt zin heeft: een openstaande stap, een streak die dreigt te breken of een toets die dichtbij komt.",
    picker: "push" as const,
  },
];

const goalOptions = [
  "Hogere cijfers halen",
  "Een toets of examen halen",
  "Minder stress voor toetsen",
  "Niet meer stampen op het laatste moment",
  "Vaste studieroutine opbouwen",
  "Stof beter onthouden op lange termijn",
];

const minuteOptions = [
  { value: 5, label: "5 min", hint: "Heel kort" },
  { value: 10, label: "10 min", hint: "Licht" },
  { value: 15, label: "15 min", hint: "Aangeraden" },
  { value: 25, label: "25 min", hint: "Stevig" },
  { value: 40, label: "40 min", hint: "Intensief" },
];

function Welkom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);

  async function askPush() {
    setPushBusy(true);
    const status = await enablePush();
    setPushStatus(status);
    setPushBusy(false);
  }

  const step = steps[index]!;
  const Icon = step.icon;
  const last = index === steps.length - 1;
  const picker = "picker" in step ? step.picker : null;
  const stepDone =
    picker === "level" ? !!level : picker === "goal" ? !!goal : picker === "minutes" ? !!minutes : true;
  const firstPickerIndex = steps.findIndex((s) => "picker" in s && s.picker);

  async function finish() {
    setSaving(true);
    if (user) {
      await supabase
        .from("profiles")
        .update({
          onboarded_at: new Date().toISOString(),
          ...(level ? { education_level: level } : {}),
          ...(goal ? { goal } : {}),
          ...(minutes ? { daily_minutes: minutes } : {}),
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

            {picker === "level" && (
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

            {picker === "goal" && (
              <div className="mt-6 flex flex-col gap-2">
                {goalOptions.map((option) => {
                  const active = goal === option;
                  return (
                    <Pressable
                      key={option}
                      scale={0.99}
                      onClick={() => setGoal(option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-[15px] font-semibold transition-colors ${
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
            )}

            {picker === "minutes" && (
              <div className="mt-6 flex flex-wrap gap-2">
                {minuteOptions.map((option) => {
                  const active = minutes === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      scale={0.98}
                      onClick={() => setMinutes(option.value)}
                      className={`min-w-[104px] rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-foreground"
                      }`}
                    >
                      <span className="block text-[16px] font-bold tracking-[-0.01em]">
                        {option.label}
                      </span>
                      <span
                        className={`block text-[13px] font-medium ${
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {option.hint}
                      </span>
                    </Pressable>
                  );
                })}
              </div>
            )}

            {picker === "push" && (
              <div className="mt-6 flex flex-col items-start gap-3">
                <Pressable
                  disabled={pushBusy || pushStatus === "registered"}
                  onClick={() => void askPush()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-[15px] font-semibold text-foreground"
                >
                  <BellRing className="size-4" aria-hidden />
                  {pushStatus === "registered"
                    ? "Meldingen staan aan"
                    : pushBusy
                      ? "Even bezig…"
                      : "Meldingen aanzetten"}
                </Pressable>
                {pushStatus && (
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {pushStatusMessage[pushStatus]}
                  </p>
                )}
                <p className="text-[13px] text-muted-foreground">
                  Je kunt dit overslaan en later aanzetten via het belletje bovenin.
                </p>
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
            disabled={saving || !stepDone}
            onClick={() => (last ? void finish() : setIndex((i) => i + 1))}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[16px] font-semibold text-primary-foreground"
          >
            {last
              ? stepDone
                ? "Mijn eerste leerset toevoegen"
                : "Kies hoeveel je per dag wilt leren"
              : picker === "level" && !level
                ? "Kies je niveau"
                : picker === "goal" && !goal
                  ? "Kies je doel"
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
          {index < firstPickerIndex && (
            <Pressable
              disabled={saving}
              onClick={() => setIndex(firstPickerIndex)}
              className="rounded-xl px-4 py-3 text-[15px] font-semibold text-muted-foreground"
            >
              Uitleg overslaan
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
