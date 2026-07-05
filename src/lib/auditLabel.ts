import type { AuditAction, AuditEvent } from "./types";

const VERB: Record<AuditAction, string> = {
  "item.created": "Added",
  "item.updated": "Edited",
  "item.completed": "Handled",
  "item.reopened": "Reopened",
  "item.snoozed": "Snoozed",
  "item.unsnoozed": "Woke up",
  "item.archived": "Archived",
  "item.restored": "Restored",
  "item.deleted": "Deleted",
  "auth.signup": "Account created",
  "auth.signin": "Signed in",
  "auth.signout": "Signed out",
  "data.exported": "Exported data",
  "data.sample_loaded": "Loaded sample data",
  "data.cleared": "Cleared all items",
  "prefs.updated": "Updated notification preferences",
  "onboarding.completed": "Finished onboarding",
};

export type AuditCategory = "item" | "auth" | "data" | "prefs" | "onboarding";

export function auditCategory(action: AuditAction): AuditCategory {
  return action.split(".")[0] as AuditCategory;
}

export function auditSentence(ev: AuditEvent): string {
  const verb = VERB[ev.action] ?? ev.action;
  const parts = [verb];
  if (ev.targetTitle) parts.push(`“${ev.targetTitle}”`);
  if (ev.detail) parts.push(`(${ev.detail})`);
  return parts.join(" ");
}
