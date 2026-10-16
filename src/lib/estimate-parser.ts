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

  // Patterns like: "troca de telhas 40 metros a 85 reais"
  const patterns = [
    /([\wÀ-ÿ\s/\-]{3,80}?)\s+(\d+[.,]?\d*)\s*(m2|m²|metros?|unidades?|un|pcs?|horas?|hrs?|kg|litros?)?\s*(?:a|por|de)?\s*(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais|real|r\$)?/gi,
    /([\wÀ-ÿ\s/\-]{3,80}?)\s+(?:r\$\s*)?(\d+[.,]?\d*)\s*(?:reais|real)/gi,
  ];

  const seen = new Set<string>();

  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const description = match[1].trim().replace(/^(e |também |mais )/i, "");
      if (description.length < 3) continue;
      const key = description.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      if (match.length >= 5) {
        const quantity = parseNum(match[2]) || 1;
        const unit = normalizeUnit(match[3] || "un");
        const unitPrice = parseNum(match[4]);
        if (unitPrice > 0) {
          items.push({
            id: uuid(),
            description: capitalize(description),
            quantity,
            unit,
            unitPrice,
          });
        }
      } else {
        const unitPrice = parseNum(match[2]);
        if (unitPrice > 0) {
          items.push({
            id: uuid(),
            description: capitalize(description),
            quantity: 1,
            unit: "un",
            unitPrice,
          });
        }
      }
    }
  }

  // Notes: sentences with "obs", "nota", "importante", "cliente pediu"
  const noteMatches = text.match(
    /(?:obs(?:ervação)?|nota|importante|cliente pediu|lembrar)[:\s]+([^.!?]+)/gi
  );
  if (noteMatches) {
    for (const n of noteMatches) {
      notes.push(n.replace(/^(obs(?:ervação)?|nota|importante)[:\s]+/i, "").trim());
    }
  }

  if (items.length === 0) {
    // Demo structured fallback from any audio
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

function parseNum(s: string): number {
  return Number(String(s).replace(",", ".")) || 0;
}

function normalizeUnit(u: string): string {
  const x = u.toLowerCase();
  if (x.startsWith("m")) return "m²";
  if (x.startsWith("hor") || x.startsWith("hr")) return "h";
  if (x.startsWith("un") || x.startsWith("pc")) return "un";
  return u || "un";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
