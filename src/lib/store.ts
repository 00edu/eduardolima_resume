"use client";

import { v4 as uuid } from "uuid";
import type {
  AgentMessage,
  AgentSettings,
  AppState,
  ChatMessage,
  Estimate,
  MediaItem,
  Project,
} from "./types";

const KEY = "obracam-state-v1";

const defaultAgent: AgentSettings = {
  name: "Lia",
  tone: "profissional, acolhedora e objetiva",
  businessName: "ObraCam Pro",
  availability: "Seg–Sáb 8h–18h",
  phone: "(11) 99999-0000",
  email: "contato@obracam.app",
};

function seedProjects(): Project[] {
  const now = Date.now();
  return [
    {
      id: uuid(),
      address: "Rua Harmonia, 540 — Vila Madalena, São Paulo",
      placeName: "Residência Harmonia",
      location: { lat: -23.5465, lng: -46.6912 },
      client: {
        name: "Ana Ribeiro",
        phone: "(11) 98888-1122",
        email: "ana.ribeiro@email.com",
      },
      createdAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 40).toISOString(),
      media: [],
      chat: [
        {
          id: uuid(),
          author: "Você",
          role: "owner",
          text: "Fotos do telhado prontas. Vou gravar o orçamento.",
          createdAt: new Date(now - 1000 * 60 * 50).toISOString(),
        },
        {
          id: uuid(),
          author: "Carlos (sub)",
          role: "subcontractor",
          text: "Beleza — telhas disponíveis amanhã.",
          createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
        },
      ],
      estimates: [],
      status: "active",
    },
    {
      id: uuid(),
      address: "Av. Paulista, 1578 — Bela Vista, São Paulo",
      placeName: "Escritório Paulista",
      location: { lat: -23.5614, lng: -46.6559 },
      client: {
        name: "Bruno Costa",
        phone: "(11) 97777-3344",
        email: "bruno@empresa.com",
      },
      createdAt: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      media: [],
      chat: [],
      estimates: [],
      status: "active",
    },
    {
      id: uuid(),
      address: "Rua Oscar Freire, 210 — Jardins, São Paulo",
      placeName: "Loja Oscar Freire",
      location: { lat: -23.5631, lng: -46.672 },
      client: {
        name: "Marina Lopes",
        phone: "(11) 96666-7788",
        email: "marina@loja.com",
      },
      createdAt: new Date(now - 1000 * 60 * 60 * 10).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      media: [],
      chat: [],
      estimates: [],
      status: "active",
    },
  ];
}

function defaultState(): AppState {
  return {
    projects: seedProjects(),
    agent: defaultAgent,
    agentInbox: [
      {
        id: uuid(),
        from: "client",
        text: "Oi! Vocês conseguem ir na sexta pela manhã?",
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      },
    ],
    currentUser: { name: "Você", role: "owner" },
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const state = defaultState();
      localStorage.setItem(KEY, JSON.stringify(state));
      return state;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("obracam-state"));
}

export function useAppStore() {
  // Imperative helpers used by pages — pages subscribe via useSyncExternalStore pattern in hook file
}

export function upsertProject(project: Project) {
  const state = loadState();
  const idx = state.projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) state.projects[idx] = project;
  else state.projects.unshift(project);
  saveState(state);
  return project;
}

export function getProject(id: string): Project | undefined {
  return loadState().projects.find((p) => p.id === id);
}

export function addMedia(projectId: string, media: MediaItem) {
  const project = getProject(projectId);
  if (!project) return;
  project.media.unshift(media);
  project.updatedAt = new Date().toISOString();
  upsertProject(project);
}

export function updateMedia(projectId: string, media: MediaItem) {
  const project = getProject(projectId);
  if (!project) return;
  project.media = project.media.map((m) => (m.id === media.id ? media : m));
  project.updatedAt = new Date().toISOString();
  upsertProject(project);
}

export function addChatMessage(projectId: string, message: ChatMessage) {
  const project = getProject(projectId);
  if (!project) return;
  project.chat.push(message);
  project.updatedAt = new Date().toISOString();
  upsertProject(project);
}

export function upsertEstimate(projectId: string, estimate: Estimate) {
  const project = getProject(projectId);
  if (!project) return;
  const idx = project.estimates.findIndex((e) => e.id === estimate.id);
  if (idx >= 0) project.estimates[idx] = estimate;
  else project.estimates.unshift(estimate);
  project.updatedAt = new Date().toISOString();
  upsertProject(project);
}

export function updateAgent(agent: AgentSettings) {
  const state = loadState();
  state.agent = agent;
  saveState(state);
}

export function addAgentMessage(message: AgentMessage) {
  const state = loadState();
  state.agentInbox.push(message);
  saveState(state);
}

export function resetDemoData() {
  const state = defaultState();
  saveState(state);
  return state;
}
