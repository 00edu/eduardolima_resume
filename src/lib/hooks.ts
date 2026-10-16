"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { GeoPoint } from "./types";
import { getCurrentPosition } from "./geo";
import { loadState, saveState } from "./store";
import type { AppState } from "./types";

// Re-export load/save for subscribe
function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("obracam-state", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("obracam-state", handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): AppState {
  return loadState();
}

function getServerSnapshot(): AppState {
  return {
    projects: [],
    agent: {
      name: "Lia",
      tone: "profissional",
      businessName: "ObraCam Pro",
      availability: "Seg–Sáb 8h–18h",
      phone: "",
      email: "",
    },
    agentInbox: [],
    currentUser: { name: "Você", role: "owner" },
  };
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setState = useCallback((next: AppState | ((prev: AppState) => AppState)) => {
    const prev = loadState();
    const value = typeof next === "function" ? next(prev) : next;
    saveState(value);
  }, []);
  return [state, setState] as const;
}

export function useGeolocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPoint(pos);
    } catch {
      // Demo fallback: centróide de SP para preview sem permissão
      setPoint({ lat: -23.5505, lng: -46.6333 });
      setError("Usando localização de demonstração (São Paulo).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { point, error, loading, refresh };
}
