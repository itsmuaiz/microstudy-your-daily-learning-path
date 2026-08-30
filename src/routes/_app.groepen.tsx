import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Copy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Pressable } from "@/components/Pressable";
import { pick, springCalm } from "@/lib/motion";

export const Route = createFileRoute("/_app/groepen")({
  head: () => ({
    meta: [
      { title: "Groepen — MicroStudy" },
      {
        name: "description",
        content:
          "Maak een groep, nodig klasgenoten uit met een code en strijd op XP in het leaderboard.",
      },
      { property: "og:title", content: "Groepen — MicroStudy" },
      {
        property: "og:description",
        content: "Studeer samen: groepen, uitnodigingscodes en een XP-leaderboard.",
      },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const groups = useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, invite_code, owner_id)")
        .eq("user_id", user!.id);
      if (error) throw error;

      const result = [];
      for (const membership of memberships ?? []) {
        const group = membership.groups as {
          id: string;
          name: string;
          invite_code: string;
          owner_id: string;
        } | null;
        if (!group) continue;
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", group.id);
        const ids = (members ?? []).map((m) => m.user_id);
        const { data: profiles } = ids.length
          ? await supabase.from("profiles").select("id, display_name, xp, streak").in("id", ids)
          : { data: [] };
        const board = [...(profiles ?? [])].sort((a, b) => b.xp - a.xp);
        result.push({ ...group, board });
      }
      return result;
    },
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: name.trim(), owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: user!.id });
      if (memberError) throw memberError;
    },
    onSuccess: async () => {
      setName("");
      toast.success("Groep aangemaakt");
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Kon groep niet maken"),
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("join_group_by_code", { _code: code.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCode("");
      toast.success("Je zit in de groep");
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Deelnemen mislukt"),
  });

  const inputClass =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-[16px] outline-none transition-shadow focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-4xl font-bold">Groepen</h1>
        <p className="mt-2 max-w-xl text-[16px] text-muted-foreground">
          Maak een groep, deel de uitnodigingscode en zie wie de meeste XP verdient.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Nieuwe groep</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam van de groep"
            className={`${inputClass} mt-4`}
            aria-label="Naam van de groep"
          />
          <Pressable
            disabled={!name.trim() || createGroup.isPending}
            onClick={() => createGroup.mutate()}
            className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-[16px] font-semibold text-primary-foreground"
          >
            Groep aanmaken
          </Pressable>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Deelnemen met code</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Bijv. 9F2AC1"
            className={`${inputClass} mt-4 uppercase`}
            aria-label="Uitnodigingscode"
          />
          <Pressable
            disabled={!code.trim() || joinGroup.isPending}
            onClick={() => joinGroup.mutate()}
            className="mt-3 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-[16px] font-semibold"
          >
            Deelnemen
          </Pressable>
        </div>
      </div>

      <section className="space-y-5">
        {groups.data?.length === 0 && (
          <p className="text-[15px] text-muted-foreground">
            Je zit nog in geen enkele groep. Maak er één of gebruik een code.
          </p>
        )}
        {groups.data?.map((group) => (
          <motion.div
            key={group.id}
            layout
            transition={pick(reduced, springCalm)}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Users className="size-5 text-accent" aria-hidden />
              <h2 className="text-xl font-semibold">{group.name}</h2>
              <Pressable
                onClick={() => {
                  void navigator.clipboard.writeText(group.invite_code);
                  toast.success("Code gekopieerd");
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-[14px] font-semibold"
              >
                <Copy className="size-3.5" aria-hidden />
                {group.invite_code}
              </Pressable>
            </div>
            <ol className="mt-5 divide-y divide-border">
              {group.board.map((member, index) => (
                <li key={member.id} className="flex items-center gap-4 py-3">
                  <span className="numeric-display w-6 text-[17px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-[16px] font-medium">
                    {member.display_name ?? "Student"}
                    {member.id === user?.id && (
                      <span className="ml-2 text-[13px] text-muted-foreground">(jij)</span>
                    )}
                  </span>
                  <span className="ml-auto text-[14px] font-semibold text-streak">
                    {member.streak}d
                  </span>
                  <span className="numeric-display w-20 text-right text-[17px] text-xp">
                    {member.xp} XP
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
