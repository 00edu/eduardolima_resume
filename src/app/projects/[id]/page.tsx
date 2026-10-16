"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  Camera,
  FileAudio,
  ImagePlus,
  MapPin,
  MessageCircle,
  Mic,
  Send,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhotoAnnotator } from "@/components/PhotoAnnotator";
import { useAppState } from "@/lib/hooks";
import {
  addChatMessage,
  addMedia,
  getProject,
  updateMedia,
  upsertEstimate,
} from "@/lib/store";
import type { MediaItem, UserRole } from "@/lib/types";
import { formatBRL, estimateTotal } from "@/lib/money";
import { buildEstimatePdf, downloadBlob } from "@/lib/pdf";
import clsx from "clsx";

type Tab = "midia" | "chat" | "orcamentos";

export default function ProjectPage() {
  const params = useParams();
  const id = String(params.id);
  const [state] = useAppState();
  const project = useMemo(() => state.projects.find((p) => p.id === id), [state, id]);
  const [tab, setTab] = useState<Tab>("midia");
  const [annotating, setAnnotating] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return (
      <AppShell title="Obra não encontrada">
        <Link href="/" className="text-sm font-semibold text-pine underline">
          Voltar
        </Link>
      </AppShell>
    );
  }

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await readFile(file);
      const media: MediaItem = {
        id: uuid(),
        type: file.type.startsWith("video") ? "video" : "photo",
        dataUrl,
        createdAt: new Date().toISOString(),
        caption: "",
        annotation: { strokes: [], notes: "" },
      };
      addMedia(project!.id, media);
    }
  }

  return (
    <AppShell
      title={project.placeName || project.client.name}
      subtitle={project.address}
      action={
        <Link
          href={`/projects/${project.id}/estimate`}
          className="inline-flex items-center gap-1.5 rounded-full bg-clay px-3 py-2 text-xs font-bold text-white shadow-soft"
        >
          <Mic size={14} /> Orçamento
        </Link>
      }
    >
      <div className="mb-4 rounded-2xl border border-ink/8 bg-white/70 p-4 shadow-soft">
        <p className="flex items-start gap-2 text-sm text-slate">
          <MapPin size={14} className="mt-0.5 text-clay" />
          {project.address}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Info label="Cliente" value={project.client.name} />
          <Info label="Telefone" value={project.client.phone || "—"} />
          <Info label="E-mail" value={project.client.email || "—"} />
        </div>
      </div>

      <Link
        href={`/projects/${project.id}/estimate`}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-3.5 text-sm font-bold text-white shadow-soft"
      >
        <Mic size={16} /> Criar orçamento por áudio
      </Link>

      <div className="mb-4 flex gap-1 rounded-xl bg-ink/5 p-1" role="tablist">
        {(
          [
            ["midia", "Mídia", Camera],
            ["chat", "Chat", MessageCircle],
            ["orcamentos", "Orçamentos", FileAudio],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-tab={key}
            onClick={() => setTab(key)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition",
              tab === key ? "bg-white text-ink shadow-sm" : "text-slate"
            )}
          >
            <Icon size={14} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {tab === "midia" ? (
        <section className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void onPickFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            data-action="add-media"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-pine/40 bg-pine/5 py-4 text-sm font-bold text-pine"
          >
            <ImagePlus size={18} /> Adicionar fotos e vídeos
          </button>

          {annotating ? (
            <div className="rounded-2xl border border-ink/8 bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Marcações e anotações</p>
                <button
                  type="button"
                  className="text-xs font-bold text-slate"
                  onClick={() => setAnnotating(null)}
                >
                  Fechar
                </button>
              </div>
              <PhotoAnnotator
                media={annotating}
                onSave={(next) => {
                  updateMedia(project.id, next);
                  setAnnotating(null);
                }}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {project.media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => m.type === "photo" && setAnnotating(m)}
                className="group relative overflow-hidden rounded-2xl border border-ink/8 bg-white/60 text-left"
              >
                {m.type === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.dataUrl} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-ink/10">
                    <Video className="text-pine" />
                  </div>
                )}
                {m.annotation.notes || m.annotation.strokes.length ? (
                  <span className="absolute bottom-2 left-2 rounded bg-clay px-1.5 py-0.5 text-[10px] font-bold text-white">
                    anotado
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {project.media.length === 0 ? (
            <p className="text-center text-sm text-slate">Nenhuma mídia ainda.</p>
          ) : null}
        </section>
      ) : null}

      {tab === "chat" ? <ProjectChat projectId={project.id} /> : null}

      {tab === "orcamentos" ? (
        <EstimatesPanel projectId={project.id} />
      ) : null}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist/80 px-2 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-ink">{value}</p>
    </div>
  );
}

function ProjectChat({ projectId }: { projectId: string }) {
  const [state] = useAppState();
  const project = getProject(projectId) || state.projects.find((p) => p.id === projectId);
  const [text, setText] = useState("");
  const [role, setRole] = useState<UserRole>("owner");
  const [author, setAuthor] = useState("Você");

  if (!project) return null;

  function send() {
    if (!text.trim()) return;
    addChatMessage(projectId, {
      id: uuid(),
      author: role === "subcontractor" ? `${author} (sub)` : author,
      role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
    setText("");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="rounded-lg border border-ink/10 bg-white/70 px-2 py-2 text-xs font-semibold"
        >
          <option value="owner">Equipe</option>
          <option value="member">Membro</option>
          <option value="subcontractor">Subcontratado</option>
        </select>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="flex-1 rounded-lg border border-ink/10 bg-white/70 px-2 py-2 text-xs"
          placeholder="Seu nome"
        />
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-ink/8 bg-white/60 p-3">
        {project.chat.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">Chat interno da obra.</p>
        ) : null}
        {project.chat.map((m) => (
          <div key={m.id} className="rounded-xl bg-mist/90 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-pine">{m.author}</span>
              <span className="text-[10px] text-slate">
                {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink">{m.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Mensagem para equipe / subs…"
          className="flex-1 rounded-xl border border-ink/10 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pine/30"
        />
        <button
          type="button"
          onClick={send}
          className="rounded-xl bg-pine px-4 text-white"
          aria-label="Enviar"
        >
          <Send size={18} />
        </button>
      </div>
    </section>
  );
}

function EstimatesPanel({ projectId }: { projectId: string }) {
  const [state] = useAppState();
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return null;

  return (
    <section className="space-y-3">
      <Link
        href={`/projects/${projectId}/estimate`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-3.5 text-sm font-bold text-white"
      >
        <Mic size={16} /> Criar orçamento por áudio
      </Link>
      {project.estimates.map((est) => (
        <div key={est.id} className="rounded-2xl border border-ink/8 bg-white/70 p-4 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-semibold">{formatBRL(estimateTotal(est))}</p>
              <p className="text-xs text-slate">
                {new Date(est.createdAt).toLocaleString("pt-BR")} · {est.status}
              </p>
            </div>
            <span className="rounded-lg bg-pine/10 px-2 py-1 text-[10px] font-bold uppercase text-pine">
              {est.items.length} itens
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-mist px-3 py-2 text-xs font-bold"
              onClick={() => {
                const blob = buildEstimatePdf(project, est);
                downloadBlob(blob, `orcamento-${est.id.slice(0, 8)}.pdf`);
              }}
            >
              PDF
            </button>
            <button
              type="button"
              className="rounded-lg bg-mist px-3 py-2 text-xs font-bold"
              onClick={async () => {
                await fetch("/api/estimate/email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: project.client.email,
                    clientName: project.client.name,
                    projectAddress: project.address,
                    total: formatBRL(estimateTotal(est)),
                    estimateId: est.id,
                  }),
                });
                upsertEstimate(project.id, {
                  ...est,
                  status: "sent",
                  followUps: [
                    ...est.followUps,
                    {
                      id: uuid(),
                      at: new Date().toISOString(),
                      channel: "email",
                      note: "Orçamento reenviado",
                    },
                  ],
                });
                alert(`E-mail enviado para ${project.client.email || "(sem e-mail)"}`);
              }}
            >
              E-mail
            </button>
            <Link
              href={`/projects/${projectId}/estimate?id=${est.id}`}
              className="rounded-lg bg-pine px-3 py-2 text-xs font-bold text-white"
            >
              Abrir
            </Link>
          </div>
        </div>
      ))}
      {project.estimates.length === 0 ? (
        <p className="text-center text-sm text-slate">Nenhum orçamento ainda.</p>
      ) : null}
    </section>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
