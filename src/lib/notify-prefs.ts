export type NotifyPrefKey =
  | "notify_study"
  | "notify_streak"
  | "notify_leaderboard"
  | "notify_inactivity";

export type NotifyPrefs = Record<NotifyPrefKey, boolean>;

export const defaultNotifyPrefs: NotifyPrefs = {
  notify_study: true,
  notify_streak: true,
  notify_leaderboard: true,
  notify_inactivity: true,
};

export const notifyOptions: { key: NotifyPrefKey; label: string; hint: string }[] = [
  {
    key: "notify_study",
    label: "Openstaande stof en toetsen",
    hint: "Als er een stap voor vandaag klaarstaat of een toets dichtbij komt.",
  },
  {
    key: "notify_streak",
    label: "Streak in gevaar",
    hint: "Als je streak dreigt te breken omdat je vandaag nog niets deed.",
  },
  {
    key: "notify_leaderboard",
    label: "Leaderboard in je groepen",
    hint: "Als je positie in een groep verandert of iemand je voorbijgaat.",
  },
  {
    key: "notify_inactivity",
    label: "Langere tijd niet geoefend",
    hint: "Een vriendelijke por als je een paar dagen niets hebt gedaan.",
  },
];
