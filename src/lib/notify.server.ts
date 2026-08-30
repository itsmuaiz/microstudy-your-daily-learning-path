/**
 * Verzenden van MicroStudy-meldingsmails.
 *
 * Zodra er een e-maildomein voor dit project is ingesteld, wordt hier de
 * transactionele mailhelper gebruikt. Tot die tijd wordt de mail alleen
 * gelogd zodat de rest van de meldingslogica (selectie, streak, afscheidsmail)
 * al volledig werkt en getest kan worden.
 */
export type MicroStudyMail = {
  to: string;
  subject: string;
  heading: string;
  body: string;
};

export async function sendMicroStudyEmail(mail: MicroStudyMail): Promise<boolean> {
  console.log("[MicroStudy e-mail]", {
    from: "MicroStudy",
    to: mail.to,
    subject: mail.subject,
    heading: mail.heading,
    body: mail.body,
  });
  return true;
}

export function buildStreakMail(name: string, streak: number): Omit<MicroStudyMail, "to"> {
  return {
    subject: `MicroStudy: je streak van ${streak} dagen loopt af`,
    heading: `Nog even, ${name}`,
    body: `Je hebt vandaag nog niet geleerd. Eén stap in je leerpad houdt je streak van ${streak} dagen in leven.`,
  };
}

export function buildInactiveMail(name: string, days: number): Omit<MicroStudyMail, "to"> {
  return {
    subject: "MicroStudy: je leerpad wacht op je",
    heading: `Welkom terug, ${name}?`,
    body: `Je hebt ${days} dagen niet geleerd. Je leerpad staat klaar — één stap is genoeg om weer op gang te komen.`,
  };
}

export function buildFarewellMail(name: string): Omit<MicroStudyMail, "to"> {
  return {
    subject: "MicroStudy: dit is onze laatste mail",
    heading: `Tot ziens, ${name}`,
    body: "Je hebt twee weken niet geleerd, dus we stoppen met mailen. Je leerpad blijft bewaard — log gewoon in als je weer wilt beginnen.",
  };
}
