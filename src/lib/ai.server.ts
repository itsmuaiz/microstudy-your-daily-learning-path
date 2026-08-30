const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function askJson<T>(system: string, user: string): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is niet beschikbaar: ontbrekende configuratie.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("Te veel verzoeken, probeer het straks opnieuw.");
    if (res.status === 402) throw new Error("AI-tegoed is op.");
    throw new Error(`AI-fout (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");
  return JSON.parse(cleaned) as T;
}
