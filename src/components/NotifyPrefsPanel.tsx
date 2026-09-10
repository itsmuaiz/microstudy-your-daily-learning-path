import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { defaultNotifyPrefs, notifyOptions, type NotifyPrefs } from "@/lib/notify-prefs";
import { updatePushPrefs } from "@/lib/push.functions";
import { Pressable } from "./Pressable";

export function NotifyPrefsPanel({
  prefs,
  disabled = false,
}: {
  prefs?: NotifyPrefs | undefined;
  disabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<NotifyPrefs>(prefs ?? defaultNotifyPrefs);

  useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  const save = useMutation({
    mutationFn: (next: NotifyPrefs) => updatePushPrefs({ data: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push-state"] }),
  });

  function toggle(key: keyof NotifyPrefs) {
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    save.mutate(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {notifyOptions.map((option) => {
        const active = local[option.key];
        return (
          <Pressable
            key={option.key}
            scale={0.995}
            disabled={disabled}
            onClick={() => toggle(option.key)}
            aria-pressed={active}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
              active ? "border-primary bg-secondary" : "border-border bg-card"
            }`}
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
              aria-hidden
            >
              {active && <Check className="size-3.5" />}
            </span>
            <span>
              <span className="block text-[15px] font-semibold">{option.label}</span>
              <span className="block text-[13px] leading-relaxed text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </Pressable>
        );
      })}
      {save.isError && (
        <p className="text-[13px] text-destructive">Opslaan lukte niet. Probeer het opnieuw.</p>
      )}
    </div>
  );
}
