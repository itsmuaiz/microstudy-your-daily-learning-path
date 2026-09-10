import { askJson } from "@/lib/ai.server";

const GATEWAY = "https://connector-gateway.lovable.dev/firebase_messaging";

type Decision = { send: boolean; title: string; body: string; reason?: string | undefined };

export type PushUserContext = {
  displayName: string;
  streak: number;
  xp: number;
  lastActiveDate: string | null;
  daysInactive: number;
  daysSinceLastPush: number | null;
  goal: string | null;
  dailyMinutes: number | null;
  openSteps: number;
  stepDueToday: boolean;
  nextExamDate: string | null;
  daysToExam: number | null;
  /** Onderwerpen waarover deze gebruiker berichten wil: study, streak, leaderboard, inactivity. */
  allowedTopics: string[];
  groupCount: number;
  bestGroupRank: number | null;
  peersAhead: number;
};

/** Laat de AI beslissen of een melding vandaag zinvol is. */
export async function decidePush(ctx: PushUserContext): Promise<Decision> {
  const result = await askJson<Decision>(
    'Je beslist of een studie-app vandaag één pushmelding stuurt aan een Nederlandse leerling. Antwoord uitsluitend met JSON: {"send":boolean,"title":string,"body":string,"reason":string}. Stuur alleen bij een duidelijke reden: een openstaande stap voor vandaag, een streak die dreigt te breken, of een toets die dichtbij is. Stuur niet als er niets te doen is of de leerling vandaag al actief was. Titel max 40 tekens, body max 110 tekens, warm en concreet, geen uitroeptekens-spam, geen emoji-reeksen.',
    JSON.stringify(ctx),
  );
  return {
    send: !!result.send,
    title: (result.title ?? "MicroStudy").slice(0, 60),
    body: (result.body ?? "Je hebt vandaag nog een stap open.").slice(0, 160),
    reason: result.reason,
  };
}

export type SendResult = { ok: boolean; status: number; stale: boolean };

export async function sendPush(
  token: string,
  title: string,
  body: string,
  path = "/leerpad",
): Promise<SendResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Push is niet geconfigureerd.");

  const res = await fetch(`${GATEWAY}/v1/projects/_/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { path },
        webpush: {
          fcm_options: { link: path },
          notification: { icon: "/icons/icon-192.png" },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`FCM send failed [${res.status}]: ${detail}`);
    return { ok: false, status: res.status, stale: res.status === 404 || res.status === 400 };
  }
  return { ok: true, status: res.status, stale: false };
}
