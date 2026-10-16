"use client";

import { useMemo } from "react";
import { Crosshair, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { useAppState, useGeolocation } from "@/lib/hooks";
import { haversineKm } from "@/lib/geo";

export default function HomePage() {
  const [state] = useAppState();
  const { point, error, loading, refresh } = useGeolocation();

  const sorted = useMemo(() => {
    if (!point) return [];
    return [...state.projects]
      .map((p) => ({
        project: p,
        distanceKm: haversineKm(point, p.location),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [state.projects, point]);

  return (
    <AppShell
      subtitle="Obras mais próximas do seu GPS primeiro."
      action={
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-white"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          GPS
        </button>
      }
    >
      <section className="mb-5 overflow-hidden rounded-3xl bg-pine text-white shadow-soft">
        <div className="relative px-5 py-6">
          <div className="absolute -right-6 -top-8 h-36 w-36 rounded-full bg-clay/40 blur-2xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-sand" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sand" />
              </span>
              Campo ao vivo
            </div>
            <h2 className="font-display text-3xl font-semibold leading-tight text-balance">
              Documente. Orce por áudio. Receba.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-white/80">
              Toque em + para abrir obra no endereço certo. Grave o orçamento falando — itens, valores e
              e-mail saem sozinhos.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-clay/10 px-3 py-2 text-xs font-medium text-clay">
          <Crosshair size={14} /> {error}
        </p>
      ) : null}

      <div className="mb-3 flex items-end justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">Por proximidade</h3>
        <span className="text-xs font-medium text-slate">{sorted.length} obras</span>
      </div>

      <div className="space-y-3">
        {loading && sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/40 p-8 text-center text-sm text-slate">
            Localizando obras próximas…
          </div>
        ) : null}
        {sorted.map(({ project, distanceKm }, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            distanceKm={distanceKm}
            index={index}
          />
        ))}
      </div>
    </AppShell>
  );
}
