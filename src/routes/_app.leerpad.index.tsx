import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm } from "@/lib/motion";
import { generateLearningPath } from "@/lib/study.functions";

export const Route = createFileRoute("/_app/leerpad/")({
  head: () => ({
    meta: [
      { title: "Leerpad — MicroStudy" },
      {
        name: "description",
        content:
          "Upload je studiestof, geef aan hoeveel tijd je hebt tot de toets en MicroStudy maakt een leerpad met dagelijkse stappen.",
      },
      { property: "og:title", content: "Leerpad — MicroStudy" },
      {
        property: "og:description",
        content: "Van studiestof naar een dagelijks leerpad met AI-vragen, streaks en XP.",
      },
    ],
  }),
  component: LeerpadOverzicht,
});

function LeerpadOverzicht() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const generate = useServerFn(generateLearningPath);

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [days, setDays] = useState(5);

  const paths = useQuery({
    queryKey: ["paths", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_paths")
        .select("id, title, days, exam_date, created_at, path_steps(id, completed_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      generate({ data: { title: title.trim(), sourceText: sourceText.trim(), days } }),
    onSuccess: async () => {
      toast.success("Leerpad klaar");
      setTitle("");
      setSourceText("");
      await queryClient.invalidateQueries({ queryKey: ["paths"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Kon leerpad niet maken"),
  });

  const words = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const perDay = days > 0 ? Math.ceil(words / days) : 0;

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-[16px] outline-none transition-shadow focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-4xl font-bold">Leerpad</h1>
        <p className="mt-2 max-w-xl text-[16px] text-muted-foreground">
          Zet je stof erin, geef aan hoeveel dagen je hebt tot de toets. Je krijgt per dag één stap
          met nieuwe vragen — tot je de hele set door hebt.
        </p>
      </section>

      <motion.section
        layout
        transition={pick(reduced, springCalm)}
        className="rounded-3xl border border-border bg-card p-7"
      >
        <h2 className="text-xl font-semibold">Nieuw leerpad</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-[13px] font-semibold">
              Vak of onderwerp
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Biologie hoofdstuk 4"
              className={inputClass}
            />
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="stof" className="block text-[13px] font-semibold">
                Studiestof (upload een bestand of plak je samenvatting)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold">
                <Upload className="size-3.5" aria-hidden />
                Bestand uploaden
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,text/plain"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (file.size > 2_000_000) {
                      toast.error("Bestand is te groot (max 2 MB).");
                      return;
                    }
                    const text = await file.text();
                    if (!text.trim()) {
                      toast.error("Dit bestand bevat geen leesbare tekst.");
                      return;
                    }
                    setSourceText((current) => (current ? `${current}\n\n${text}` : text));
                    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
                    toast.success(`${file.name} toegevoegd`);
                  }}
                />
              </label>
            </div>
            <textarea
              id="stof"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={8}
              placeholder="Plak hier je stof…"
              className={`${inputClass} resize-y leading-relaxed`}
            />
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {words} woorden · tekstbestanden (.txt, .md) worden direct ingelezen
            </p>
          </div>
          <div>
            <label htmlFor="dagen" className="mb-1.5 block text-[13px] font-semibold">
              Dagen tot de toets: <span className="numeric-display">{days}</span>
            </label>
            <input
              id="dagen"
              type="range"
              min={1}
              max={21}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            {words > 0 && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Ongeveer <span className="font-semibold text-foreground">{perDay} woorden stof</span>{" "}
                en 1 stap met vragen per dag.
              </p>
            )}
          </div>
          <Pressable
            disabled={create.isPending || sourceText.trim().length < 40 || !title.trim()}
            onClick={() => create.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[16px] font-semibold text-primary-foreground"
          >
            <Sparkles className="size-4" aria-hidden />
            {create.isPending ? "Leerpad wordt gebouwd…" : "Maak mijn leerpad"}
          </Pressable>
        </div>
      </motion.section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Mijn leerpaden</h2>
        {paths.data?.length === 0 && (
          <p className="text-[15px] text-muted-foreground">Nog geen leerpad. Maak er hierboven één.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {paths.data?.map((path) => {
            const steps = path.path_steps ?? [];
            const done = steps.filter((s) => s.completed_at).length;
            const pct = steps.length ? (done / steps.length) * 100 : 0;
            return (
              <Link
                key={path.id}
                to="/leerpad/$pathId"
                params={{ pathId: path.id }}
                className="group rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_16px_40px_-24px_oklch(0.2_0.03_260/0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{path.title}</h3>
                  <ArrowRight
                    className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {done} van {steps.length} stappen afgerond
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={pick(reduced, springCalm)}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
