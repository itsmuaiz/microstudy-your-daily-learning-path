import { registerPushDevice } from "@/lib/push.functions";

const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as
  | string
  | undefined;
const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as
    | string
    | undefined,
  projectId: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as
    | string
    | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "error";

/** Vraag toestemming en registreer dit apparaat. Alleen aanroepen vanuit een klik. */
export async function enablePush(): Promise<PushStatus> {
  try {
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId ||
      !appId ||
      !vapidKey ||
      !firebaseConfig.messagingSenderId
    ) {
      return "not-configured";
    }
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";

    const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
    if (!(await isSupported())) return "unsupported";
    if (window.top !== window.self) return "open-in-new-tab";

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const query = new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId,
      messagingSenderId: firebaseConfig.messagingSenderId,
    }).toString();

    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${query}`,
      { scope: "/firebase-cloud-messaging-push-scope" },
    );

    const { initializeApp, getApps } = await import("firebase/app");
    const options = {
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId,
      messagingSenderId: firebaseConfig.messagingSenderId,
    };
    const app = getApps()[0] ?? initializeApp(options);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration });
    if (!token) return "denied";

    await registerPushDevice({
      data: { token, userAgent: navigator.userAgent.slice(0, 300) },
    });
    return "registered";
  } catch (error) {
    console.error("Push registratie mislukt", error);
    return "error";
  }
}

export const pushStatusMessage: Record<PushStatus, string> = {
  registered: "Meldingen staan aan op dit apparaat.",
  "not-configured": "Meldingen zijn nog niet ingesteld voor deze app.",
  unsupported: "Deze browser ondersteunt meldingen niet. Probeer Chrome of Safari.",
  "open-in-new-tab":
    "Open MicroStudy in een eigen tabblad (of vanaf je beginscherm) om meldingen aan te zetten.",
  denied: "Meldingen staan geblokkeerd. Zet ze aan bij de site-instellingen van je browser.",
  error: "Meldingen aanzetten lukte niet. Probeer het later opnieuw.",
};
