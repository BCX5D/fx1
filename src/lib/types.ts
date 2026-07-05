export type ItemKind =
  | "subscription"
  | "bill"
  | "renewal"
  | "deadline"
  | "warranty"
  | "document";

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly" | "once";

export type ItemStatus = "active" | "done" | "archived";

export type SourceType = "manual" | "paste" | "file" | "sample";

export interface SourceRef {
  type: SourceType;
  fileName?: string;
  /** The exact text the extraction was based on, so users can always see where data came from. */
  snippet?: string;
  addedAt: string;
}

export type ConfidenceField = "title" | "vendor" | "amount" | "nextDue" | "cadence" | "kind";

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  vendor?: string;
  amount?: number;
  currency: string;
  cadence: Cadence;
  /** ISO date (yyyy-mm-dd). Absent for pure documents. */
  nextDue?: string;
  remindDaysBefore: number;
  status: ItemStatus;
  /** ISO date. While in the future, the item is considered snoozed. */
  snoozedUntil?: string;
  notes?: string;
  source: SourceRef;
  /** 0..1 per extracted field. Only present on AI-extracted items. */
  confidence?: Partial<Record<ConfidenceField, number>>;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "item.created"
  | "item.updated"
  | "item.completed"
  | "item.reopened"
  | "item.snoozed"
  | "item.unsnoozed"
  | "item.archived"
  | "item.restored"
  | "item.deleted"
  | "auth.signup"
  | "auth.signin"
  | "auth.signout"
  | "data.exported"
  | "data.sample_loaded"
  | "data.cleared"
  | "prefs.updated"
  | "onboarding.completed";

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  targetId?: string;
  targetTitle?: string;
  detail?: string;
}

export interface NotificationPrefs {
  dueSoonAlerts: boolean;
  weeklyDigest: boolean;
  defaultLeadDays: number;
  email: string;
}

export interface UserDB {
  items: Item[];
  audit: AuditEvent[];
  prefs: NotificationPrefs;
  onboarded: boolean;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  issuedAt: string;
  expiresAt: string;
}

export type Urgency = "overdue" | "today" | "soon" | "upcoming" | "later" | "none";

export const KIND_LABEL: Record<ItemKind, string> = {
  subscription: "Subscription",
  bill: "Bill",
  renewal: "Renewal",
  deadline: "Deadline",
  warranty: "Warranty",
  document: "Document",
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  once: "One-time",
};

export const DEFAULT_LEAD_DAYS: Record<ItemKind, number> = {
  subscription: 3,
  bill: 5,
  renewal: 21,
  deadline: 7,
  warranty: 30,
  document: 30,
};
