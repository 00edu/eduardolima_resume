"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  CreditCard,
  FileDown,
  Loader2,
  Mail,
  Mic,
  Square,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/hooks";
import { upsertEstimate } from "@/lib/store";
import type { Estimate, EstimateLineItem } from "@/lib/types";
import {
  estimateTotal,
  formatBRL,
  lineTotal,
} from "@/lib/money";
import { buildEstimatePdf, downloadBlob } from "@/lib/pdf";
import clsx from "clsx";

export default function EstimatePage() {
  const params = useParams();
  const search = useSearchParams();
  const projectId = String(params.id);
  const [state] = useAppState();
  const project = useMemo(
    () => state.projects.find((p) => p.id === projectId),
    [state, projectId]
  );

  const existingId = search.get("id");
  const existing = project?.estimates.find((e) => e.id === existingId);

  const [estimate, setEstimate] = useState<Estimate | null>(existing || null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState(existing?.transcript || "");
  const [statusMsg, setStatusMsg] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (existing) setEstimate(existing);
  }, [existing]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    if (search.get("paid") !== "1" || !project || !estimate || estimate.status === "paid") {
      return;
    }
    const next = { ...estimate, status: "paid" as const };
    setEstimate(next);
    upsertEstimate(project.id, next);
    setStatusMsg("Pagamento confirmado!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, project?.id]);

  const demoRequested = search.get("demo") === "1";
  const demoStarted = useRef(false);
  useEffect(() => {
    if (!demoRequested || !project || demoStarted.current) return;
    demoStarted.current = true;
    const demo =
      "Troca de telhas cerâmicas 40 metros a 85 reais, calha de alumínio 12 metros a 60 reais, impermeabilização da laje 25 metros a 95 reais, mão de obra completa 2800 reais. Observação: cliente pediu garantia de um ano e visita na sexta de manhã.";
    (async () => {
      setProcessing(true);
      setStatusMsg("Transcrevendo e separando itens…");
      try {
        const form = new FormData();
        form.append("audio", new Blob(), "estimate.webm");
        form.append("demoTranscript", demo);
        const res = await fetch("/api/estimate/from-audio", { method: "POST", body: form });
        const data = await res.json();
        setTranscript(data.transcript || "");
        const next: Estimate = {
          id: uuid(),
          projectId: project.id,
          createdAt: new Date().toISOString(),
          transcript: data.transcript || "",
          items: data.items as EstimateLineItem[],
          notes: data.notes || "",
          taxRate: 0,
          status: "draft",
          followUps: [],
        };
        setEstimate(next);
        upsertEstimate(project.id, next);
        setStatusMsg(`Pronto (${data.source}). Revise e envie ao cliente.`);
      } catch {
        setStatusMsg("Falha ao processar áudio.");
        demoStarted.current = false;
      } finally {
        setProcessing(false);
      }
    })();
  }, [demoRequested, project]);

  if (!project) {
    return (
      <AppShell title="Obra não encontrada">
        <Link href="/" className="text-sm font-semibold text-pine underline">
          Voltar
        </Link>
      </AppShell>
    );
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void processAudio(new Blob(chunks.current, { type: "audio/webm" }));
    };
    mediaRecorder.current = rec;
    rec.start();
    setRecording(true);
    setSeconds(0);
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
  }

  async function processAudio(blob: Blob, demoTranscript?: string) {
    setProcessing(true);
    setStatusMsg("Transcrevendo e separando itens…");
    try {
      const form = new FormData();
      form.append("audio", blob, "estimate.webm");
      if (demoTranscript) form.append("demoTranscript", demoTranscript);
      const res = await fetch("/api/estimate/from-audio", { method: "POST", body: form });
      const data = await res.json();
      setTranscript(data.transcript || "");
      const next: Estimate = {
        id: estimate?.id || uuid(),
        projectId: project!.id,
        createdAt: estimate?.createdAt || new Date().toISOString(),
        transcript: data.transcript || "",
        items: data.items as EstimateLineItem[],
        notes: data.notes || "",
        taxRate: 0,
        status: "draft",
        followUps: estimate?.followUps || [],
      };
      setEstimate(next);
      upsertEstimate(project!.id, next);
      setStatusMsg(`Pronto (${data.source}). Revise e envie ao cliente.`);
    } catch {
      setStatusMsg("Falha ao processar áudio.");
    } finally {
      setProcessing(false);
    }
  }

  async function runDemoSpeech() {
    const demo =
      "Troca de telhas cerâmicas 40 metros a 85 reais, calha de alumínio 12 metros a 60 reais, impermeabilização da laje 25 metros a 95 reais, mão de obra completa 2800 reais. Observação: cliente pediu garantia de um ano e visita na sexta de manhã.";
    setProcessing(true);
    await processAudio(new Blob(), demo);
  }

  function updateItem(id: string, patch: Partial<EstimateLineItem>) {
    if (!estimate || !project) return;
    const next = {
      ...estimate,
      items: estimate.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    };
    setEstimate(next);
    upsertEstimate(project.id, next);
  }

  async function sendEmail() {
    if (!estimate || !project) return;
    setStatusMsg("Enviando e-mail…");
    await fetch("/api/estimate/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: project.client.email,
        clientName: project.client.name,
        projectAddress: project.address,
        total: formatBRL(estimateTotal(estimate)),
        estimateId: estimate.id,
      }),
    });
    const next = {
      ...estimate,
      status: "sent" as const,
      followUps: [
        ...estimate.followUps,
        {
          id: uuid(),
          at: new Date().toISOString(),
          channel: "email",
          note: "Orçamento enviado ao cliente",
        },
      ],
    };
    setEstimate(next);
    upsertEstimate(project.id, next);
    setStatusMsg(`E-mail enviado para ${project.client.email || "—"}`);
  }

  function downloadPdf() {
    if (!estimate || !project) return;
    const blob = buildEstimatePdf(project, estimate);
    downloadBlob(blob, `orcamento-${project.client.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  async function startPayment(provider: "stripe" | "square") {
    if (!estimate || !project) return;
    const amountCents = Math.round(estimateTotal(estimate) * 100);
    if (provider === "stripe") {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          description: `Orçamento ObraCam — ${project.placeName || project.address}`,
          estimateId: estimate.id,
          successUrl: `${window.location.origin}/projects/${project.id}/estimate?id=${estimate.id}&paid=1`,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      const next = {
        ...estimate,
        paymentProvider: "stripe" as const,
        paymentUrl: data.url,
        status: "sent" as const,
      };
      setEstimate(next);
      upsertEstimate(project.id, next);
      if (data.url) window.location.href = data.url;
      return;
    }
    // Square demo link
    const next = {
      ...estimate,
      paymentProvider: "square" as const,
      paymentUrl: `#square-demo-${estimate.id}`,
      status: "sent" as const,
      followUps: [
        ...estimate.followUps,
        {
          id: uuid(),
          at: new Date().toISOString(),
          channel: "square",
          note: "Link Square (demo) gerado",
        },
      ],
    };
    setEstimate(next);
    upsertEstimate(project.id, next);
    setStatusMsg("Link Square gerado (modo demonstração). Configure SQUARE_ACCESS_TOKEN para produção.");
  }

  function convertInvoice() {
    if (!estimate || !project) return;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${estimate.id.slice(0, 6).toUpperCase()}`;
    const next = {
      ...estimate,
      status: "invoiced" as const,
      invoiceNumber,
      followUps: [
        ...estimate.followUps,
        {
          id: uuid(),
          at: new Date().toISOString(),
          channel: "invoice",
          note: `Convertido para fatura ${invoiceNumber}`,
        },
      ],
    };
    setEstimate(next);
    upsertEstimate(project.id, next);
    setStatusMsg(`Fatura ${invoiceNumber} criada.`);
  }

  function scheduleFollowUp() {
    if (!estimate || !project) return;
    const next = {
      ...estimate,
      status: "followup" as const,
      followUps: [
        ...estimate.followUps,
        {
          id: uuid(),
          at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          channel: "auto",
          note: "Follow-up automático em 48h se não houver resposta",
        },
      ],
    };
    setEstimate(next);
    upsertEstimate(project.id, next);
    setStatusMsg("Follow-up agendado para 48h.");
  }

  return (
    <AppShell
      title="Criar orçamento"
      subtitle="Fale os itens e valores — o ObraCam separa tudo."
      action={
        <Link href={`/projects/${project.id}`} className="rounded-full bg-white/70 p-2 text-ink">
          <ArrowLeft size={16} />
        </Link>
      }
    >
      <section className="mb-5 overflow-hidden rounded-3xl bg-ink text-sand shadow-soft">
        <div className="px-5 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Captação de áudio</p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {recording
              ? Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block h-8 w-1.5 origin-bottom rounded-full bg-clay animate-wave"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))
              : null}
          </div>
          <p className="mt-3 font-display text-4xl font-semibold tabular-nums">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
          <div className="mt-5 flex flex-col items-center gap-3">
            {!recording ? (
              <button
                type="button"
                disabled={processing}
                onClick={() => void startRecording()}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-clay text-white shadow-soft transition hover:scale-105"
              >
                <Mic size={32} />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-white shadow-soft"
              >
                <Square size={28} fill="currentColor" />
              </button>
            )}
            <p className="text-sm text-sand/70">
              {recording ? "Falando… toque para enviar" : "Toque para gravar o orçamento"}
            </p>
            <button
              type="button"
              data-action="demo-audio"
              onClick={() => void runDemoSpeech()}
              disabled={processing || recording}
              className="mt-1 w-full max-w-xs rounded-xl border border-sand/30 bg-white/10 px-4 py-3 text-sm font-bold text-sand transition hover:bg-white/20 disabled:opacity-50"
            >
              Usar áudio de demonstração
            </button>
          </div>
        </div>
      </section>

      {processing ? (
        <p className="mb-4 flex items-center gap-2 text-sm font-medium text-pine">
          <Loader2 className="animate-spin" size={16} /> Processando…
        </p>
      ) : null}
      {statusMsg ? (
        <p className="mb-4 rounded-xl bg-pine/10 px-3 py-2 text-xs font-semibold text-pine">
          {statusMsg}
        </p>
      ) : null}

      {transcript ? (
        <div className="mb-4 rounded-2xl border border-ink/8 bg-white/70 p-3 text-sm text-slate">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate">Transcrição</p>
          {transcript}
        </div>
      ) : null}

      {estimate ? (
        <section className="space-y-4">
          <div className="space-y-2">
            {estimate.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-ink/8 bg-white/80 p-3 shadow-sm"
              >
                <input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  className="w-full bg-transparent font-semibold text-ink outline-none"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Num
                    label="Qtd"
                    value={item.quantity}
                    onChange={(v) => updateItem(item.id, { quantity: v })}
                  />
                  <label className="text-xs">
                    <span className="text-slate">Un</span>
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      className="mt-1 w-full rounded-lg bg-mist px-2 py-2 font-semibold"
                    />
                  </label>
                  <Num
                    label="Preço"
                    value={item.unitPrice}
                    onChange={(v) => updateItem(item.id, { unitPrice: v })}
                  />
                </div>
                <p className="mt-2 text-right text-sm font-bold text-clay">
                  {formatBRL(lineTotal(item.quantity, item.unitPrice))}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-pine px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Total</p>
            <p className="font-display text-3xl font-semibold">{formatBRL(estimateTotal(estimate))}</p>
            {estimate.invoiceNumber ? (
              <p className="mt-1 text-xs text-white/80">Fatura {estimate.invoiceNumber}</p>
            ) : null}
          </div>

          <textarea
            value={estimate.notes}
            onChange={(e) => {
              const next = { ...estimate, notes: e.target.value };
              setEstimate(next);
              upsertEstimate(project.id, next);
            }}
            rows={3}
            className="w-full rounded-2xl border border-ink/8 bg-white/70 px-3 py-2 text-sm outline-none"
            placeholder="Notas gerais do orçamento"
          />

          <div className="grid grid-cols-2 gap-2">
            <Action icon={<Mail size={16} />} label="E-mail cliente" onClick={() => void sendEmail()} />
            <Action icon={<FileDown size={16} />} label="Baixar PDF" onClick={downloadPdf} />
            <Action
              icon={<CreditCard size={16} />}
              label="Pagar Stripe"
              onClick={() => void startPayment("stripe")}
            />
            <Action
              icon={<CreditCard size={16} />}
              label="Pagar Square"
              onClick={() => void startPayment("square")}
            />
            <Action icon={<Receipt size={16} />} label="Virar invoice" onClick={convertInvoice} />
            <Action
              icon={<RefreshCw size={16} />}
              label="Follow-up"
              onClick={scheduleFollowUp}
            />
          </div>

          {estimate.followUps.length > 0 ? (
            <div className="rounded-2xl border border-ink/8 bg-white/60 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate">Histórico</p>
              <ul className="space-y-1.5 text-xs text-slate">
                {estimate.followUps.map((f) => (
                  <li key={f.id}>
                    {new Date(f.at).toLocaleString("pt-BR")} · {f.channel}: {f.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs">
      <span className="text-slate">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg bg-mist px-2 py-2 font-semibold"
      />
    </label>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white/80 py-3 text-xs font-bold text-ink transition hover:bg-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
