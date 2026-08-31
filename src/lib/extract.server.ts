import { unzipSync, strFromU8 } from "fflate";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Leest de tekst uit een .docx: dat is een zip met word/document.xml. */
export function extractDocxText(base64: string): string {
  const files = unzipSync(base64ToBytes(base64));
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("Dit Word-bestand kon niet gelezen worden.");
  const xml = strFromU8(doc);
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

/** Laat het AI-model de tekst uit een PDF of foto halen (OCR waar nodig). */
export async function extractWithAI(params: {
  filename: string;
  mimeType: string;
  base64: string;
}): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is niet beschikbaar: ontbrekende configuratie.");

  const dataUrl = `data:${params.mimeType};base64,${params.base64}`;
  const isImage = params.mimeType.startsWith("image/");
  const blocks: Block[] = [
    {
      type: "text",
      text: isImage
        ? "Dit is een foto van studiestof. Geef alle leesbare tekst terug als platte tekst, in leesvolgorde. Beschrijf schema's, tabellen of tekeningen kort in woorden zodat de inhoud bruikbaar blijft om te leren. Geen inleiding, geen opmaakcodes."
        : "Geef de volledige inhoud van dit document terug als platte tekst, in leesvolgorde, met koppen op eigen regels. Geen inleiding, geen opmaakcodes.",
    },
    isImage
      ? { type: "image_url", image_url: { url: dataUrl } }
      : { type: "file", file: { filename: params.filename, file_data: dataUrl } },
  ];

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [{ role: "user", content: blocks }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("Te veel verzoeken, probeer het straks opnieuw.");
    if (res.status === 402) throw new Error("AI-tegoed is op.");
    if (res.status === 403) throw new Error("AI is uitgeschakeld voor dit project.");
    throw new Error(`Bestand uitlezen mislukte (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
