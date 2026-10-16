"use client";

import { useState } from "react";
import { v4 as uuid } from "uuid";
import { Bot, CalendarClock, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/hooks";
import { addAgentMessage, updateAgent } from "@/lib/store";

export default function AgentPage() {
  const [state] = useAppState();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [agent, setAgent] = useState(state.agent);

  async function sendAsClient() {
    if (!message.trim()) return;
    setSending(true);
    const clientMsg = {
      id: uuid(),
      from: "client" as const,
      text: message.trim(),
      createdAt: new Date().toISOString(),
    };
    addAgentMessage(clientMsg);
    setMessage("");
    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clientMsg.text,
          agent: state.agent,
          history: state.agentInbox,
        }),
      });
      const data = await res.json();
      addAgentMessage({
        id: uuid(),
        from: "agent",
        text: data.reply,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }

  function saveAgent(e: React.FormEvent) {
    e.preventDefault();
    updateAgent(agent);
  }

  return (
    <AppShell
      title="Seu agente"
      subtitle="Conversa com seus clientes, agenda visitas e registra alterações."
    >
      <section className="mb-5 rounded-3xl bg-gradient-to-br from-pine to-[#1e3d35] p-5 text-white shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Bot size={24} />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold">{state.agent.name}</p>
            <p className="text-sm text-white/75">{state.agent.businessName}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-white/80">
          <CalendarClock size={14} /> {state.agent.availability}
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-sand/90">
          <Sparkles size={14} /> Tom: {state.agent.tone}
        </p>
      </section>

      <form onSubmit={saveAgent} className="mb-5 space-y-3 rounded-2xl border border-ink/8 bg-white/70 p-4">
        <h3 className="font-display text-lg font-semibold">Configurar agente</h3>
        <Field label="Nome do agente" value={agent.name} onChange={(v) => setAgent({ ...agent, name: v })} />
        <Field
          label="Empresa"
          value={agent.businessName}
          onChange={(v) => setAgent({ ...agent, businessName: v })}
        />
        <Field label="Tom" value={agent.tone} onChange={(v) => setAgent({ ...agent, tone: v })} />
        <Field
          label="Disponibilidade"
          value={agent.availability}
          onChange={(v) => setAgent({ ...agent, availability: v })}
        />
        <button type="submit" className="w-full rounded-xl bg-pine py-3 text-sm font-bold text-white">
          Salvar agente
        </button>
      </form>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Simular conversa do cliente</h3>
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-ink/8 bg-white/60 p-3">
          {state.agentInbox.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "client"
                  ? "ml-auto bg-clay text-white"
                  : "bg-mist text-ink"
              }`}
            >
              <p className="text-[10px] font-bold uppercase opacity-70">
                {m.from === "client" ? "Cliente" : state.agent.name}
              </p>
              <p className="mt-0.5">{m.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sendAsClient()}
            placeholder="Ex: Consigo remarcar para sexta 10h?"
            className="flex-1 rounded-xl border border-ink/10 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-pine/30"
          />
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendAsClient()}
            className="rounded-xl bg-clay px-4 text-white disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-slate">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/10 bg-mist/50 px-3 py-2.5 text-sm font-medium normal-case text-ink outline-none focus:ring-2 focus:ring-pine/30"
      />
    </label>
  );
}
