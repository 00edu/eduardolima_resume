import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import { parseEstimateFromTranscript } from "@/lib/estimate-parser";
import type { EstimateLineItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const audio = form.get("audio");
  const demoTranscript = String(form.get("demoTranscript") || "");

  let transcript = demoTranscript;

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && audio instanceof Blob && audio.size > 0) {
    try {
      const openai = new OpenAI({ apiKey });
      const file = new File([audio], "estimate.webm", {
        type: audio.type || "audio/webm",
      });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "pt",
      });
      transcript = transcription.text;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você extrai orçamentos de construção/reforma a partir de áudio transcrito em português do Brasil.
Retorne JSON: {
  "items": [{"description": string, "quantity": number, "unit": string, "unitPrice": number, "notes": string}],
  "notes": string
}
Valores em BRL. Se o preço for total e não unitário, use quantity=1.
Seja fiel ao que foi dito; não invente itens demais.`,
          },
          { role: "user", content: transcript },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw) as {
        items?: Omit<EstimateLineItem, "id">[];
        notes?: string;
      };
      const items: EstimateLineItem[] = (parsed.items || []).map((item) => ({
        id: uuid(),
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "un",
        unitPrice: Number(item.unitPrice) || 0,
        notes: item.notes,
      }));

      if (items.length > 0) {
        return NextResponse.json({
          transcript,
          items,
          notes: parsed.notes || "",
          source: "openai",
        });
      }
    } catch (err) {
      console.error("OpenAI estimate failed, falling back", err);
    }
  }

  if (!transcript) {
    transcript =
      "Troca de telhas 40 metros a 85 reais, calha de alumínio 12 metros a 60 reais, mão de obra 1800 reais. Observação: cliente pediu garantia de 1 ano.";
  }

  const fallback = parseEstimateFromTranscript(transcript);
  return NextResponse.json({
    transcript,
    items: fallback.items,
    notes: fallback.notes,
    source: apiKey ? "fallback" : "demo",
  });
}
