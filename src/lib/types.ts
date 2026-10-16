export type UserRole = "owner" | "member" | "subcontractor";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ClientInfo {
  name: string;
  phone: string;
  email: string;
}

export interface AnnotationStroke {
  id: string;
  color: string;
  points: { x: number; y: number }[];
}

export interface PhotoAnnotation {
  strokes: AnnotationStroke[];
  notes: string;
}

export interface MediaItem {
  id: string;
  type: "photo" | "video";
  dataUrl: string;
  createdAt: string;
  caption: string;
  annotation: PhotoAnnotation;
}

export interface ChatMessage {
  id: string;
  author: string;
  role: UserRole;
  text: string;
  createdAt: string;
}

export interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes?: string;
}

export type EstimateStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "invoiced"
  | "paid"
  | "followup";

export interface Estimate {
  id: string;
  projectId: string;
  createdAt: string;
  transcript: string;
  items: EstimateLineItem[];
  notes: string;
  taxRate: number;
  status: EstimateStatus;
  followUps: { id: string; at: string; channel: string; note: string }[];
  paymentProvider?: "stripe" | "square";
  paymentUrl?: string;
  invoiceNumber?: string;
}

export interface Project {
  id: string;
  address: string;
  placeName?: string;
  location: GeoPoint;
  client: ClientInfo;
  createdAt: string;
  updatedAt: string;
  media: MediaItem[];
  chat: ChatMessage[];
  estimates: Estimate[];
  status: "active" | "completed" | "archived";
}

export interface AgentSettings {
  name: string;
  tone: string;
  businessName: string;
  availability: string;
  phone: string;
  email: string;
}

export interface AgentMessage {
  id: string;
  from: "client" | "agent";
  text: string;
  createdAt: string;
}

export interface AppState {
  projects: Project[];
  agent: AgentSettings;
  agentInbox: AgentMessage[];
  currentUser: { name: string; role: UserRole };
}
