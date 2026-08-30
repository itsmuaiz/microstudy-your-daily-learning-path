/**
 * Verzenden van MicroStudy-meldingsmails.
 *
 * Live verzending loopt via Resend. Zodra RESEND_API_KEY is ingesteld worden de
 * mails echt bezorgd; het afzenderadres komt uit MICROSTUDY_MAIL_FROM
 * (bijv. "MicroStudy <meldingen@jouwdomein.nl>"). Zonder API-key valt de helper
 * terug op loggen, zodat de meldingslogica ook zonder domein blijft werken.
 */
export type MicroStudyMail = {
  to: string;
  subject: string;
  heading: string;
  body: string;
};

const DEFAULT_FROM = "MicroStudy <onboarding@resend.dev>";

function renderHtml(mail: MicroStudyMail): string {
  return `<!doctype html>
<html lang="nl">
  <body style="margin:0;padding:32px 16px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px 8px;font-size:14px;font-weight:600;letter-spacing:-0.01em;color:#1d3fd6;">MicroStudy</td>
      </tr>
      <tr>
        <td style="padding:0 28px 8px;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${mail.heading}</td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;font-size:16px;line-height:1.6;color:#3a3a3c;">${mail.body}</td>
      </tr>
      <tr>
        <td style="padding:0 28px 32px;">
          <a href="https://project--5b0b2e64-484a-4a5d-80c2-9f386ebe6339.lovable.app/leerpad" style="display:inline-block;background:#1d3fd6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:999px;">Naar mijn leerpad</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;font-size:12px;line-height:1.6;color:#8e8e93;">Je ontvangt deze mail omdat je meldingen aan hebt staan in MicroStudy. Je kunt ze uitzetten in je profiel.</td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendMicroStudyEmail(mail: MicroStudyMail): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["MICROSTUDY_MAIL_FROM"] ?? DEFAULT_FROM;

  if (!apiKey) {
    console.log("[MicroStudy e-mail: niet verzonden, geen RESEND_API_KEY]", {
      to: mail.to,
      subject: mail.subject,
    });
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: renderHtml(mail),
        text: `${mail.heading}\n\n${mail.body}`,
      }),
    });

    if (!response.ok) {
      console.error("[MicroStudy e-mail mislukt]", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[MicroStudy e-mail fout]", error);
    return false;
  }
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
