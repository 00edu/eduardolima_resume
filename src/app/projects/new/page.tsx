"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { Check, Loader2, MapPinned, Navigation } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGeolocation } from "@/lib/hooks";
import { upsertProject } from "@/lib/store";
import clsx from "clsx";

interface NearbyAddress {
  id: string;
  label: string;
  placeName: string;
  lat: number;
  lng: number;
  distanceM: number;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { point, loading: gpsLoading, refresh } = useGeolocation();
  const [addresses, setAddresses] = useState<NearbyAddress[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [selected, setSelected] = useState<NearbyAddress | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("");

  useEffect(() => {
    if (!point) return;
    let cancelled = false;
    (async () => {
      setLoadingAddr(true);
      try {
        const res = await fetch(`/api/nearby-addresses?lat=${point.lat}&lng=${point.lng}`);
        const data = await res.json();
        if (cancelled) return;
        setAddresses(data.addresses || []);
        setSource(data.source || "");
        if (data.addresses?.[0]) setSelected(data.addresses[0]);
      } finally {
        if (!cancelled) setLoadingAddr(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [point]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !clientName.trim()) return;
    setSaving(true);
    const project = {
      id: uuid(),
      address: selected.label,
      placeName: selected.placeName,
      location: { lat: selected.lat, lng: selected.lng },
      client: {
        name: clientName.trim(),
        phone: clientPhone.trim(),
        email: clientEmail.trim(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      media: [],
      chat: [],
      estimates: [],
      status: "active" as const,
    };
    upsertProject(project);
    router.push(`/projects/${project.id}`);
  }

  return (
    <AppShell
      title="Nova obra"
      subtitle="GPS pega o local; você só confirma o endereço e o cliente."
      action={
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full border border-ink/10 bg-white/70 p-2 text-ink"
          aria-label="Atualizar GPS"
        >
          <Navigation size={16} />
        </button>
      }
    >
      <form onSubmit={handleCreate} className="space-y-5">
        <section className="rounded-2xl border border-ink/8 bg-white/70 p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-pine">
            <MapPinned size={16} />
            Endereços ao redor
            {source ? (
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate">
                {source}
              </span>
            ) : null}
          </div>

          {gpsLoading || loadingAddr ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate">
              <Loader2 className="animate-spin" size={16} /> Buscando endereços próximos…
            </div>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {addresses.map((addr) => (
                <li key={addr.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(addr)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                      selected?.id === addr.id
                        ? "border-pine bg-pine/5"
                        : "border-transparent bg-mist/60 hover:border-ink/10"
                    )}
                  >
                    <span
                      className={clsx(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        selected?.id === addr.id
                          ? "border-pine bg-pine text-white"
                          : "border-ink/20"
                      )}
                    >
                      {selected?.id === addr.id ? <Check size={12} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{addr.placeName}</span>
                      <span className="mt-0.5 block text-xs text-slate line-clamp-2">{addr.label}</span>
                      <span className="mt-1 block text-[11px] font-bold text-clay">
                        {addr.distanceM} m
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-ink/8 bg-white/70 p-4 shadow-soft">
          <h3 className="font-display text-lg font-semibold text-ink">Cliente</h3>
          <Field label="Nome" value={clientName} onChange={setClientName} required placeholder="Nome do cliente" />
          <Field label="Telefone" value={clientPhone} onChange={setClientPhone} placeholder="(11) 99999-9999" />
          <Field
            label="E-mail"
            value={clientEmail}
            onChange={setClientEmail}
            type="email"
            placeholder="cliente@email.com"
          />
        </section>

        <button
          type="submit"
          disabled={!selected || !clientName.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-clay py-4 text-sm font-bold text-white shadow-soft transition enabled:hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : null}
          Abrir obra neste endereço
        </button>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink/10 bg-mist/50 px-3 py-3 text-sm text-ink outline-none ring-pine/30 placeholder:text-slate/60 focus:ring-2"
      />
    </label>
  );
}
