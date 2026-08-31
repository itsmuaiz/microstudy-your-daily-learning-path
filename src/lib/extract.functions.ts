import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractDocxText, extractWithAI } from "./extract.server";

/** Haalt platte tekst uit een geüpload bestand (PDF, Word, foto of tekstbestand). */
export const extractFileText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        mimeType: z.string().min(1).max(120),
        base64: z.string().min(8).max(14_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const name = data.filename.toLowerCase();
    const mime = data.mimeType;

    const isDocx =
      name.endsWith(".docx") ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isPdf = name.endsWith(".pdf") || mime === "application/pdf";
    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/.test(name);

    if (name.endsWith(".doc") && !isDocx) {
      throw new Error("Oude .doc-bestanden werken niet. Bewaar het als .docx of PDF.");
    }

    let text = "";
    if (isDocx) {
      text = extractDocxText(data.base64);
    } else if (isPdf || isImage) {
      text = await extractWithAI({
        filename: data.filename,
        mimeType: isPdf ? "application/pdf" : mime || "image/jpeg",
        base64: data.base64,
      });
    } else {
      throw new Error("Dit bestandstype wordt niet ondersteund.");
    }

    if (text.trim().length < 20) {
      throw new Error("Er is te weinig leesbare tekst gevonden in dit bestand.");
    }
    return { text: text.trim() };
  });
