export type ItemType = "task" | "idea" | "note" | "reference";
export type Priority = "high" | "medium" | "low";
export type ItemStatus = "open" | "in_progress" | "done" | "dismissed";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type GoalTimeframe = "weekly" | "monthly" | "quarterly" | "yearly";
export type GoalStatus = "active" | "completed" | "abandoned";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Dump {
  id: string;
  user_id: string;
  raw_text: string;
  processed: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  dump_id: string | null;
  project_id: string | null;
  category_id: string | null;
  type: ItemType;
  title: string;
  body: string | null;
  priority: Priority;
  status: ItemStatus;
  due_date: string | null;
  suggested_date: string | null;
  ai_confidence: number | null;
  recurring: boolean;
  suggested_project: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  project?: Project;
}

export interface Goal {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  timeframe: GoalTimeframe;
  progress: number;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

export interface AIExtractedItem {
  title: string;
  body: string | null;
  type: ItemType;
  category: string;
  project: string | null;
  priority: Priority;
  suggested_date: string | null;
  recurring: boolean;
  reasoning: string;
}

export const DEFAULT_CATEGORIES = [
  { name: "Work", color: "#3b82f6", icon: "briefcase" },
  { name: "Personal", color: "#8b5cf6", icon: "home" },
  { name: "Health & Fitness", color: "#22c55e", icon: "heart" },
  { name: "Finance", color: "#eab308", icon: "dollar-sign" },
  { name: "Learning", color: "#f97316", icon: "book-open" },
  { name: "Relationships", color: "#ec4899", icon: "users" },
] as const;

// ============================================================
// RECORDS VAULT
// ============================================================

export interface RecordCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  name: string;
  record_category_id: string | null;
  specialty: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  would_use_again: boolean | null;
  created_at: string;
  updated_at: string;
  record_category?: RecordCategory;
}

export interface VaultRecord {
  id: string;
  user_id: string;
  provider_id: string | null;
  record_category_id: string | null;
  dump_id: string | null;
  title: string;
  description: string | null;
  service_date: string;
  cost: number | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  follow_up_completed: boolean;
  outcome: string | null;
  would_use_again: boolean | null;
  created_at: string;
  updated_at: string;
  provider?: Provider;
  record_category?: RecordCategory;
}

export interface AIExtractedRecord {
  type: "record";
  title: string;
  description: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  provider_address: string | null;
  record_category: string;
  specialty: string | null;
  service_date: string | null;
  cost: number | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  outcome: string | null;
  would_use_again: boolean | null;
  reasoning: string;
}

export const DEFAULT_RECORD_CATEGORIES = [
  { name: "Medical",       color: "#22c55e", icon: "stethoscope" },
  { name: "Home Services", color: "#f97316", icon: "home"        },
  { name: "Auto",          color: "#3b82f6", icon: "car"         },
  { name: "Financial",     color: "#eab308", icon: "dollar-sign" },
  { name: "Legal",         color: "#8b5cf6", icon: "scale"       },
] as const;
