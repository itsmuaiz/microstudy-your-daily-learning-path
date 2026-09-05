import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { askJson } from "./ai.server";

export const generateLearningPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().min(1).max(120),
        sourceText: z.string().min(40).max(30000),
        days: z.number().int().min(1).max(30),
        examDate: z.string().nullable().optional(),
        questionMode: z.enum(["multiple_choice", "open", "both"]).default("multiple_choice"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("education_level, goal, daily_minutes")
      .eq("id", context.userId)
      .maybeSingle();
    const level = profile?.education_level ?? null;
    const goal = profile?.goal ?? null;
    const minutes = profile?.daily_minutes ?? null;

    const outline = await askJson<{ steps: { title: string; summary: string }[] }>(
      "Je bent een Nederlandse studiecoach. Je verdeelt studiestof in opeenvolgende dagelijkse leerstappen. Antwoord uitsluitend met JSON: {\"steps\":[{\"title\":string,\"summary\":string}]}. De titel is kort (max 6 woorden), de summary beschrijft in 1-2 zinnen precies wat die dag geleerd wordt.",
      `Verdeel deze studiestof in exact ${data.days} leerstappen (1 per dag), oplopend in moeilijkheid en zonder overlap.${
        level ? `\n\nNiveau van de leerling: ${level}. Stem taal en diepgang hierop af.` : ""
      }${goal ? `\n\nDoel van de leerling: ${goal}. Laat de stappen hieraan bijdragen.` : ""}${
        minutes
          ? `\n\nDe leerling wil ongeveer ${minutes} minuten per dag leren. Maak elke stap passend bij die tijdsduur (niet groter).`
          : ""
      }\n\nTitel: ${data.title}\n\nSTOF:\n${data.sourceText}`,
    );


    const steps = (outline.steps ?? []).slice(0, data.days);
    if (steps.length === 0) throw new Error("Kon geen leerpad genereren uit deze stof.");

    const { data: path, error: pathError } = await context.supabase
      .from("study_paths")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_text: data.sourceText,
        days: steps.length,
        exam_date: data.examDate ?? null,
        question_mode: data.questionMode,
      })
      .select()
      .single();
    if (pathError || !path) throw new Error(pathError?.message ?? "Kon leerpad niet opslaan.");

    const today = new Date();
    const rows = steps.map((step, index) => {
      const unlock = new Date(today);
      unlock.setDate(today.getDate() + index);
      return {
        path_id: path.id,
        user_id: context.userId,
        day_index: index + 1,
        title: step.title?.slice(0, 120) || `Dag ${index + 1}`,
        summary: step.summary?.slice(0, 400) ?? null,
        unlock_date: unlock.toISOString().slice(0, 10),
      };
    });

    const { error: stepsError } = await context.supabase.from("path_steps").insert(rows);
    if (stepsError) throw new Error(stepsError.message);

    return { pathId: path.id as string, steps: rows.length };
  });

export const generateStepQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ stepId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("step_questions")
      .select("id")
      .eq("step_id", data.stepId)
      .limit(1);
    if (existing && existing.length > 0) return { created: 0 };

    const { data: step, error: stepError } = await context.supabase
      .from("path_steps")
      .select("id, title, summary, day_index, path_id, study_paths(source_text, title, question_mode)")
      .eq("id", data.stepId)
      .single();
    if (stepError || !step) throw new Error("Stap niet gevonden.");

    const pathInfo = step.study_paths as
      | { source_text: string; question_mode: string | null }
      | null;
    const source = pathInfo?.source_text ?? "";
    const mode = (pathInfo?.question_mode ?? "multiple_choice") as
      | "multiple_choice"
      | "open"
      | "both";

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("education_level, goal, daily_minutes")
      .eq("id", context.userId)
      .maybeSingle();
    const level = profile?.education_level ?? null;
    const goal = profile?.goal ?? null;
    const minutes = profile?.daily_minutes ?? null;
    const count = minutes ? Math.max(4, Math.min(10, Math.round(minutes / 2.5))) : 6;

    const shared = `${
      level ? `\n\nNiveau van de leerling: ${level}. Stem moeilijkheid en woordkeuze hierop af.` : ""
    }${goal ? `\n\nDoel van de leerling: ${goal}. Richt de vragen hierop.` : ""}${
      minutes ? `\n\nDe sessie mag ongeveer ${minutes} minuten duren.` : ""
    }\n\nOnderdeel (dag ${step.day_index}): ${step.title}\n${step.summary ?? ""}\n\nVOLLEDIGE STOF:\n${source.slice(0, 12000)}`;

    const mcCount = mode === "open" ? 0 : mode === "both" ? Math.ceil(count / 2) : count;
    const openCount = mode === "multiple_choice" ? 0 : mode === "both" ? Math.floor(count / 2) : count;

    type Row = {
      step_id: string;
      user_id: string;
      position: number;
      kind: string;
      prompt: string;
      options: string[] | null;
      correct_index: number | null;
      model_answer: string | null;
      explanation: string | null;
    };
    const rows: Row[] = [];

    if (mcCount > 0) {
      const result = await askJson<{
        questions: {
          prompt: string;
          options: string[];
          correct_index: number;
          explanation: string;
        }[];
      }>(
        "Je maakt Nederlandse meerkeuzevragen over studiestof. Antwoord uitsluitend met JSON: {\"questions\":[{\"prompt\":string,\"options\":[string,string,string,string],\"correct_index\":number,\"explanation\":string}]}. Precies 4 opties per vraag, exact 1 juist antwoord, uitleg in 1 zin.",
        `Maak ${mcCount} nieuwe meerkeuzevragen over uitsluitend dit onderdeel van de stof.${shared}`,
      );
      for (const q of (result.questions ?? []).slice(0, mcCount)) {
        if (!Array.isArray(q.options) || q.options.length < 2) continue;
        rows.push({
          step_id: data.stepId,
          user_id: context.userId,
          position: rows.length,
          kind: "multiple_choice",
          prompt: q.prompt,
          options: q.options,
          correct_index: Math.max(0, Math.min(q.options.length - 1, q.correct_index ?? 0)),
          model_answer: null,
          explanation: q.explanation ?? null,
        });
      }
    }

    if (openCount > 0) {
      const result = await askJson<{
        questions: { prompt: string; model_answer: string; explanation?: string }[];
      }>(
        "Je maakt Nederlandse open vragen over studiestof. Antwoord uitsluitend met JSON: {\"questions\":[{\"prompt\":string,\"model_answer\":string,\"explanation\":string}]}. Elke vraag is te beantwoorden in 1-3 zinnen; model_answer is het volledige juiste antwoord.",
        `Maak ${openCount} nieuwe open vragen over uitsluitend dit onderdeel van de stof.${shared}`,
      );
      for (const q of (result.questions ?? []).slice(0, openCount)) {
        if (!q.prompt || !q.model_answer) continue;
        rows.push({
          step_id: data.stepId,
          user_id: context.userId,
          position: rows.length,
          kind: "open",
          prompt: q.prompt,
          options: null,
          correct_index: null,
          model_answer: q.model_answer,
          explanation: q.explanation ?? null,
        });
      }
    }

    const questions = rows;
    if (questions.length === 0) throw new Error("Kon geen vragen genereren.");

    const { error } = await context.supabase.from("step_questions").insert(questions);
    if (error) throw new Error(error.message);
    return { created: questions.length };
  });

export const completeStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ stepId: z.string().uuid(), correct: z.number().int().min(0).max(20) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const xp = data.correct * 10;

    const { data: step } = await context.supabase
      .from("path_steps")
      .select("id, completed_at")
      .eq("id", data.stepId)
      .single();
    if (!step) throw new Error("Stap niet gevonden.");

    if (!step.completed_at) {
      await context.supabase
        .from("path_steps")
        .update({ completed_at: new Date().toISOString(), xp_awarded: xp })
        .eq("id", data.stepId);
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("xp, streak, last_active_date")
      .eq("id", context.userId)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = profile?.streak ?? 0;
    if (profile?.last_active_date === today) {
      // streak already counted today
    } else if (profile?.last_active_date === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }

    await context.supabase
      .from("profiles")
      .update({
        xp: (profile?.xp ?? 0) + (step.completed_at ? 0 : xp),
        streak,
        last_active_date: today,
      })
      .eq("id", context.userId);

    return { xp: step.completed_at ? 0 : xp, streak };
  });
