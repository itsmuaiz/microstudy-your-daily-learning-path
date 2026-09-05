import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm } from "@/lib/motion";
import { generateLearningPath } from "@/lib/study.functions";
import { extractFileText } from "@/lib/extract.functions";

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
  const extract = useServerFn(extractFileText);

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [days, setDays] = useState(5);
  const [questionMode, setQuestionMode] = useState<"multiple_choice" | "open" | "both">("both");
  const [reading, setReading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
      generate({
        data: { title: title.trim(), sourceText: sourceText.trim(), days, questionMode },
      }),
    onSuccess: async () => {
      toast.success("Leerpad klaar");
      setTitle("");
      setSourceText("");
      await queryClient.invalidateQueries({ queryKey: ["paths"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Kon leerpad niet maken"),
  });

  const remove = useMutation({
    mutationFn: async (pathId: string) => {
      const { error } = await supabase.from("study_paths").delete().eq("id", pathId);
      if (error) throw error;
    },
    onSuccess: async () => {
      setConfirmDelete(null);
      toast.success("Leerpad verwijderd");
      await queryClient.invalidateQueries({ queryKey: ["paths"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Kon leerpad niet verwijderen"),
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
              <label
                className={`inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold ${
                  reading ? "cursor-wait opacity-60" : "cursor-pointer"
                }`}
              >
                <Upload className="size-3.5" aria-hidden />
                {reading ? "Bestand wordt uitgelezen…" : "Bestand uploaden"}
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/*"
                  disabled={reading}
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (file.size > 10_000_000) {
                      toast.error("Bestand is te groot (max 10 MB).");
                      return;
                    }
                    const name = file.name.toLowerCase();
                    const isPlain =
                      /\.(txt|md|csv|json)$/.test(name) || file.type.startsWith("text/");
                    try {
                      setReading(true);
                      let text = "";
                      if (isPlain) {
                        text = await file.text();
                      } else {
                        const buffer = new Uint8Array(await file.arrayBuffer());
                        let binary = "";
                        for (let i = 0; i < buffer.length; i += 1)
                          binary += String.fromCharCode(buffer[i]!);
                        const result = await extract({
                          data: {
                            filename: file.name,
                            mimeType: file.type || "application/octet-stream",
                            base64: btoa(binary),
                          },
                        });
                        text = result.text;
                      }
                      if (!text.trim()) {
                        toast.error("Dit bestand bevat geen leesbare tekst.");
                        return;
                      }
                      setSourceText((current) => (current ? `${current}\n\n${text}` : text));
                      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
                      toast.success(`${file.name} toegevoegd`);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Bestand uitlezen mislukte",
                      );
                    } finally {
                      setReading(false);
                    }
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
              {words} woorden · ondersteund: PDF, Word (.docx), foto's (JPG, PNG, WEBP) en tekst
              (.txt, .md) · max 10 MB. Tekst uit PDF's en foto's wordt automatisch herkend.
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
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Soort vragen</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "multiple_choice", label: "Meerkeuzevragen" },
                  { value: "open", label: "Open vragen" },
                  { value: "both", label: "Allebei" },
                ] as const
              ).map((option) => {
                const active = questionMode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    aria-pressed={active}
                    onClick={() => setQuestionMode(option.value)}
                    className={`rounded-full border px-4 py-2 text-[14px] font-semibold ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </Pressable>
                );
              })}
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Bij open vragen typ je je antwoord zelf en kijkt MicroStudy het na met uitleg.
            </p>
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
            const confirming = confirmDelete === path.id;
            return (
              <div key={path.id} className="relative">
                <Link
                  to="/leerpad/$pathId"
                  params={{ pathId: path.id }}
                  className="group block rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-[0_16px_40px_-24px_oklch(0.2_0.03_260/0.35)]"
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

                <Pressable
                  aria-label={`Leerpad ${path.title} verwijderen`}
                  onClick={() => setConfirmDelete(path.id)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold text-muted-foreground"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Verwijderen
                </Pressable>

                <AnimatePresence>
                  {confirming && (
                    <motion.div
                      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                      transition={pick(reduced, springCalm)}
                      className="absolute inset-0 flex flex-col justify-center gap-3 rounded-3xl border border-border bg-card/85 p-6 backdrop-blur-xl"
                      role="dialog"
                      aria-label="Leerpad verwijderen"
                    >
                      <div>
                        <p className="text-[15px] font-semibold">Dit leerpad verwijderen?</p>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          “{path.title}” en alle stappen en vragen verdwijnen definitief. Dit kan
                          niet ongedaan worden gemaakt.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pressable
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(path.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-[14px] font-semibold text-destructive-foreground"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          {remove.isPending ? "Verwijderen…" : "Definitief verwijderen"}
                        </Pressable>
                        <Pressable
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-xl bg-secondary px-4 py-2 text-[14px] font-semibold"
                        >
                          Annuleren
                        </Pressable>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </section>
    </div>
  );
}
