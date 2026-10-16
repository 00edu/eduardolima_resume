import { v4 as uuid } from "uuid";
import type { EstimateLineItem } from "./types";

/** Fallback parser when OpenAI is unavailable — extracts spoken BR estimate patterns. */
export function parseEstimateFromTranscript(transcript: string): {
  items: EstimateLineItem[];
  notes: string;
} {
  const text = transcript.replace(/\s+/g, " ").trim();
  const items: EstimateLineItem[] = [];
  const notes: string[] = [];
  const consumed: { start: number; end: number }[] = [];

  function overlaps(start: number, end: number) {
    return consumed.some((c) => !(end <= c.start || start >= c.end));
  }

  // qty + unit + price: "telhas 40 metros a 85 reais"
  const withQty =
    /([\wÀ-ÿ][\wÀ-ÿ\s/\-]{2,60}?)\s+(\d+[.,]?\d*)\s*(m2|m²|metros?|unidades?|un|pcs?|horas?|hrs?|kg|litros?)?\s*(?:a|por|de)?\s*(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais|real|r\$)?/gi;

  let match: RegExpExecArray | null;
  while ((match = withQty.exec(text)) !== null) {
    if (overlaps(match.index, match.index + match[0].length)) continue;
    const description = cleanDesc(match[1]);
    if (description.length < 3) continue;
    const quantity = parseNum(match[2]) || 1;
    const unit = normalizeUnit(match[3] || "un");
    const unitPrice = parseNum(match[4]);
    if (unitPrice <= 0) continue;
    consumed.push({ start: match.index, end: match.index + match[0].length });
    items.push({
      id: uuid(),
      description: capitalize(description),
      quantity,
      unit,
      unitPrice,
    });
  }

  // flat price: "mão de obra 1800 reais"
  const flat =
    /([\wÀ-ÿ][\wÀ-ÿ\s/\-]{2,60}?)\s+(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais|real)/gi;
  while ((match = flat.exec(text)) !== null) {
    if (overlaps(match.index, match.index + match[0].length)) continue;
    const description = cleanDesc(match[1]);
    if (description.length < 3) continue;
    const unitPrice = parseNum(match[2]);
    if (unitPrice <= 0) continue;
    // skip if this looks like a leftover of qty pattern ("40 metros a 85")
    if (/^\d/.test(description) || /metros?\s+a$/i.test(description)) continue;
    consumed.push({ start: match.index, end: match.index + match[0].length });
    items.push({
      id: uuid(),
      description: capitalize(description),
      quantity: 1,
      unit: "un",
      unitPrice,
    });
  }

  const noteMatches = text.match(
    /(?:obs(?:ervação)?|nota|importante|cliente pediu|lembrar|garantia)[:\s]+([^.!?]+)/gi
  );
  if (noteMatches) {
    for (const n of noteMatches) {
      notes.push(
        n.replace(/^(obs(?:ervação)?|nota|importante|garantia)[:\s]+/i, "").trim()
      );
    }
  }
  if (/garantia/i.test(text) && notes.length === 0) {
    const g = text.match(/garantia[^.!?]*/i);
    if (g) notes.push(g[0].trim());
  }

  if (items.length === 0) {
    items.push(
      {
        id: uuid(),
        description: "Mão de obra / visita técnica",
        quantity: 1,
        unit: "un",
        unitPrice: 350,
        notes: "Extraído do áudio (modo demonstração)",
      },
      {
        id: uuid(),
        description: "Materiais conforme descrição falada",
        quantity: 1,
        unit: "un",
        unitPrice: 1200,
      }
    );
    notes.push(
      text
        ? `Transcrição: ${text.slice(0, 280)}${text.length > 280 ? "…" : ""}`
        : "Áudio processado em modo demonstração."
    );
  }

  return { items, notes: notes.join(" · ") };
}

function cleanDesc(s: string): string {
  return s
    .trim()
    .replace(/^(e |também |mais |com )/i, "")
    .replace(/\s+/g, " ");
}

function parseNum(s: string): number {
  return Number(String(s).replace(",", ".")) || 0;
}

function normalizeUnit(u: string): string {
  const x = (u || "").toLowerCase();
  if (x.startsWith("m")) return "m²";
  if (x.startsWith("hor") || x.startsWith("hr")) return "h";
  if (x.startsWith("un") || x.startsWith("pc")) return "un";
  return u || "un";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
