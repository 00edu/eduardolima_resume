"use client";

import Link from "next/link";
import { MapPin, Camera, MessageCircle } from "lucide-react";
import type { Project } from "@/lib/types";
import { formatDistance } from "@/lib/geo";

export function ProjectCard({
  project,
  distanceKm,
  index,
}: {
  project: Project;
  distanceKm: number;
  index: number;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block animate-rise rounded-2xl border border-ink/8 bg-white/70 p-4 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/90"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-ink">
            {project.placeName || project.client.name}
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate">
            <MapPin size={14} className="mt-0.5 shrink-0 text-clay" />
            <span className="line-clamp-2">{project.address}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-pine/10 px-2.5 py-1 text-xs font-bold text-pine">
          {formatDistance(distanceKm)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate">
        <span className="inline-flex items-center gap-1">
          <Camera size={13} /> {project.media.length} mídia
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={13} /> {project.chat.length} msgs
        </span>
        <span className="ml-auto text-ink/70">{project.client.name}</span>
      </div>
    </Link>
  );
}
