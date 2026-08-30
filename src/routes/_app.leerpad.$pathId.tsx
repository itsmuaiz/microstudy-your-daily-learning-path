import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Check, Lock, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm, springMomentum } from "@/lib/motion";
import { completeStep, generateStepQuestions } from "@/lib/study.functions";

export const Route = createFileRoute("/_app/leerpad/$pathId")({
  head: () => ({
    meta: [
      { title: "Jouw leerpad — MicroStudy" },
      {
        name: "description",
        content: "Volg je dagelijkse stappen, beantwoord AI-vragen over je stof en verdien XP.",
      },
      { property: "og:title", content: "Jouw leerpad — MicroStudy" },
      {
        property: "og:description",
        content: "Stap voor stap door je stof, één sessie per dag.",
      },
    ],
  }),
  component: PathDetail,
});

type StepRow = {
  id: string;
  day_index: number;
  title: string;
  summary: string | null;
  unlock_date: string;
  completed_at: string | null;
  xp_awarded: number;
};

function PathDetail() {
  const { pathId } = Route.useParams();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<StepRow | null>(null);

  const path = useQuery({
    queryKey: ["path", pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_paths")
        .select("id, title, days, exam_date")
        .eq("id", pathId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const steps = useQuery({
    queryKey: ["steps", pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("path_steps")
        .select("id, day_index, title, summary, unlock_date, completed_at, xp_awarded")
        .eq("path_id", pathId)
        .order("day_index");
      if (error) throw error;
      return (data ?? []) as StepRow[];
    },
  });

  const rows = steps.data ?? [];
  const done = rows.filter((s) => s.completed_at).length;
  const pct = rows.length ? (done / rows.length) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);
  const firstOpenIndex = rows.findIndex((s) => !s.completed_at);

  function isUnlocked(step: StepRow, index: number) {
    if (step.completed_at) return true;
    return index === firstOpenIndex && step.unlock_date <= today;
  }

  return (
    <div className="space-y-9">
      <div>
        <Link
          to="/leerpad"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Leerpad
        </Link>
        <h1 className="mt-3 text-4xl font-bold">{path.data?.title ?? "Leerpad"}</h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          {done} van {rows.length} stappen klaar · vandaag 1 stap te doen
        </p>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={pick(reduced, springCalm)}
          />
        </div>
      </div>

      <ol className="relative space-y-3 border-l border-border pl-6">
        {rows.map((step, index) => {
          const unlocked = isUnlocked(step, index);
          const complete = !!step.completed_at;
          return (
            <li key={step.id}>
              <Pressable
                disabled={!unlocked}
                onClick={() => setActiveStep(step)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left ${
                  complete
                    ? "border-primary/40 bg-primary/5"
                    : unlocked
                      ? "border-border bg-card"
                      : "border-border/60 bg-secondary/40"
                }`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-full text-[15px] font-bold ${
                    complete
                      ? "bg-primary text-primary-foreground"
                      : unlocked
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {complete ? (
                    <Check className="size-5" aria-hidden />
                  ) : unlocked ? (
                    <Play className="size-4" aria-hidden />
                  ) : (
                    <Lock className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-muted-foreground">
                    Dag {step.day_index}
                  </span>
                  <span className="block text-[17px] font-semibold">{step.title}</span>
                  {step.summary && (
                    <span className="mt-0.5 block text-[14px] leading-relaxed text-muted-foreground">
                      {step.summary}
                    </span>
                  )}
                  {!unlocked && !complete && (
                    <span className="mt-1 block text-[13px] text-muted-foreground">
                      Ontgrendelt op {step.unlock_date}
                    </span>
                  )}
                </span>
                {complete && (
                  <span className="ml-auto shrink-0 text-[15px] font-semibold text-xp">
                    +{step.xp_awarded} XP
                  </span>
                )}
              </Pressable>
            </li>
          );
        })}
      </ol>

      <AnimatePresence>
        {activeStep && (
          <SessionSheet
            step={activeStep}
            onClose={async () => {
              setActiveStep(null);
              await queryClient.invalidateQueries({ queryKey: ["steps", pathId] });
              await queryClient.invalidateQueries({ queryKey: ["profile"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionSheet({ step, onClose }: { step: StepRow; onClose: () => void }) {
  const reduced = useReducedMotion();
  const generate = useServerFn(generateStepQuestions);
  const finish = useServerFn(completeStep);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useQuery({
    queryKey: ["questions", step.id],
    queryFn: async () => {
      await generate({ data: { stepId: step.id } });
      const { data, error } = await supabase
        .from("step_questions")
        .select("id, prompt, options, correct_index, explanation")
        .eq("step_id", step.id)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((q) => ({
        ...q,
        options: (q.options as string[]) ?? [],
      }));
    },
  });

  const complete = useMutation({
    mutationFn: async (score: number) => finish({ data: { stepId: step.id, correct: score } }),
    onSuccess: (result) => {
      if (result.xp > 0) toast.success(`+${result.xp} XP · streak ${result.streak} dagen`);
      setFinished(true);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Opslaan mislukt"),
  });

  const list = questions.data ?? [];
  const current = list[index];

  function answer(option: number) {
    if (picked !== null || !current) return;
    setPicked(option);
    const isRight = option === current.correct_index;
    const score = correct + (isRight ? 1 : 0);
    if (isRight) setCorrect(score);
    if (index === list.length - 1) complete.mutate(score);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <button
        aria-label="Sessie sluiten"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/20 backdrop-blur-md"
      />
      <motion.div
        drag={reduced ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, info) => {
          if (info.offset.y > 140) onClose();
        }}
        initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
        transition={pick(reduced, springMomentum)}
        className="glass relative z-10 max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border p-7 sm:rounded-3xl"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <p className="text-[13px] font-semibold text-muted-foreground">
          Dag {step.day_index} · {step.title}
        </p>

        {questions.isPending && <p className="mt-6 text-[16px]">Vragen worden gemaakt…</p>}
        {questions.isError && (
          <p className="mt-6 text-[16px] text-destructive">
            Kon vragen niet laden. Sluit en probeer opnieuw.
          </p>
        )}

        {finished && (
          <div className="mt-6">
            <h2 className="text-3xl font-bold">Stap afgerond</h2>
            <p className="mt-2 text-[16px] text-muted-foreground">
              {correct} van {list.length} goed. Morgen ontgrendelt de volgende stap.
            </p>
            <Pressable
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-[16px] font-semibold text-primary-foreground"
            >
              Terug naar leerpad
            </Pressable>
          </div>
        )}

        {!finished && current && (
          <div className="mt-4">
            <h2 className="text-2xl font-bold">{current.prompt}</h2>
            <div className="mt-5 space-y-2.5">
              {current.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === current.correct_index;
                const state =
                  picked === null
                    ? "idle"
                    : isCorrect
                      ? "correct"
                      : optionIndex === picked
                        ? "wrong"
                        : "idle";
                return (
                  <Pressable
                    key={optionIndex}
                    onClick={() => answer(optionIndex)}
                    scale={0.985}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-[16px] ${
                      state === "correct"
                        ? "border-primary bg-primary/10 font-semibold"
                        : state === "wrong"
                          ? "border-destructive bg-destructive/10"
                          : "border-border bg-card"
                    }`}
                  >
                    {option}
                  </Pressable>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-5">
                {current.explanation && (
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {current.explanation}
                  </p>
                )}
                {index < list.length - 1 && (
                  <Pressable
                    onClick={() => {
                      setIndex(index + 1);
                      setPicked(null);
                    }}
                    className="mt-4 w-full rounded-xl bg-primary px-5 py-3 text-[16px] font-semibold text-primary-foreground"
                  >
                    Volgende vraag
                  </Pressable>
                )}
              </div>
            )}

            <p className="mt-6 text-[13px] text-muted-foreground">
              Vraag {index + 1} van {list.length}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
