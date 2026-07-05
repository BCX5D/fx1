import type { AuditAction, AuditEvent, Item, NotificationPrefs, UserDB } from "./types";
import { supabase } from "./supabase";
import type { Json } from "./database.types";

/**
 * Persistence boundary. The Store keeps an in-memory snapshot that the UI reads
 * synchronously (via useSyncExternalStore) and delegates durable writes to a
 * StoreBackend. Two backends exist:
 *   - SupabaseBackend: Postgres tables (lp_items / lp_audit / lp_prefs), every
 *     row guarded by RLS scoped to auth.uid(). This is the production path.
 *   - LocalBackend: localStorage, for the offline demo only.
 *
 * Mutations are optimistic: the in-memory snapshot updates and emits immediately,
 * then the backend write runs. Backend failures are surfaced to the console and
 * (in Supabase mode) trigger a background reload so the UI reconverges with the
 * source of truth rather than silently drifting.
 */

const AUDIT_CAP = 500;

function emptyDB(email: string): UserDB {
  return {
    items: [],
    audit: [],
    prefs: { dueSoonAlerts: true, weeklyDigest: true, defaultLeadDays: 7, email },
    onboarded: false,
  };
}

interface StoreBackend {
  load(): Promise<UserDB>;
  insertItems(items: Item[]): Promise<void>;
  upsertItem(item: Item): Promise<void>;
  deleteItem(id: string): Promise<void>;
  insertAudit(events: AuditEvent[]): Promise<void>;
  savePrefs(prefs: NotificationPrefs, onboarded: boolean): Promise<void>;
  deleteAllItems(): Promise<void>;
}

/* --------------------------- localStorage backend -------------------------- */

class LocalBackend implements StoreBackend {
  constructor(private key: string, private email: string) {}

  async load(): Promise<UserDB> {
    const raw = localStorage.getItem(this.key);
    // brief settle so first paint shows layout-matched skeletons instead of a flash
    await new Promise((r) => setTimeout(r, 250));
    if (!raw) return emptyDB(this.email);
    try {
      return JSON.parse(raw) as UserDB;
    } catch {
      return emptyDB(this.email);
    }
  }
  // Local writes persist the whole blob; the Store hands us the current snapshot.
  private write(db: UserDB) { localStorage.setItem(this.key, JSON.stringify(db)); }
  private db: UserDB | null = null;
  bind(db: UserDB) { this.db = db; this.write(db); }
  async insertItems() { if (this.db) this.write(this.db); }
  async upsertItem() { if (this.db) this.write(this.db); }
  async deleteItem() { if (this.db) this.write(this.db); }
  async insertAudit() { if (this.db) this.write(this.db); }
  async savePrefs() { if (this.db) this.write(this.db); }
  async deleteAllItems() { if (this.db) this.write(this.db); }
}

/* ---------------------------- Supabase backend ----------------------------- */

type Db = NonNullable<typeof supabase>;

function itemToRow(it: Item, userId: string) {
  return {
    id: it.id,
    user_id: userId,
    kind: it.kind,
    title: it.title,
    vendor: it.vendor ?? null,
    amount: it.amount ?? null,
    currency: it.currency,
    cadence: it.cadence,
    next_due: it.nextDue ?? null,
    remind_days_before: it.remindDaysBefore,
    status: it.status,
    snoozed_until: it.snoozedUntil ?? null,
    notes: it.notes ?? null,
    source: it.source as unknown as Json,
    confidence: (it.confidence ?? null) as unknown as Json,
    created_at: it.createdAt,
    updated_at: it.updatedAt,
  };
}

function rowToItem(r: Record<string, unknown>): Item {
  return {
    id: r.id as string,
    kind: r.kind as Item["kind"],
    title: r.title as string,
    vendor: (r.vendor as string | null) ?? undefined,
    amount: (r.amount as number | null) ?? undefined,
    currency: r.currency as string,
    cadence: r.cadence as Item["cadence"],
    nextDue: (r.next_due as string | null) ?? undefined,
    remindDaysBefore: r.remind_days_before as number,
    status: r.status as Item["status"],
    snoozedUntil: (r.snoozed_until as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
    source: r.source as Item["source"],
    confidence: (r.confidence as Item["confidence"]) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function auditToRow(ev: AuditEvent, userId: string) {
  return {
    id: ev.id,
    user_id: userId,
    at: ev.at,
    actor: ev.actor,
    action: ev.action,
    target_id: ev.targetId ?? null,
    target_title: ev.targetTitle ?? null,
    detail: ev.detail ?? null,
  };
}

function rowToAudit(r: Record<string, unknown>): AuditEvent {
  return {
    id: r.id as string,
    at: r.at as string,
    actor: r.actor as string,
    action: r.action as AuditAction,
    targetId: (r.target_id as string | null) ?? undefined,
    targetTitle: (r.target_title as string | null) ?? undefined,
    detail: (r.detail as string | null) ?? undefined,
  };
}

class SupabaseBackend implements StoreBackend {
  constructor(private db: Db, private userId: string, private email: string) {}

  async load(): Promise<UserDB> {
    const [items, audit, prefs] = await Promise.all([
      this.db.from("lp_items").select("*").order("created_at", { ascending: false }),
      this.db.from("lp_audit").select("*").order("at", { ascending: false }).limit(AUDIT_CAP),
      this.db.from("lp_prefs").select("*").eq("user_id", this.userId).maybeSingle(),
    ]);
    if (items.error) throw items.error;
    if (audit.error) throw audit.error;
    if (prefs.error) throw prefs.error;

    let prefsRow = prefs.data;
    if (!prefsRow) {
      // First login: create the prefs row so onboarding state has a home.
      const seed = { user_id: this.userId, email: this.email };
      const created = await this.db.from("lp_prefs").insert(seed).select("*").single();
      if (created.error) throw created.error;
      prefsRow = created.data;
    }

    return {
      items: (items.data ?? []).map(rowToItem),
      audit: (audit.data ?? []).map(rowToAudit),
      prefs: {
        dueSoonAlerts: prefsRow.due_soon_alerts,
        weeklyDigest: prefsRow.weekly_digest,
        defaultLeadDays: prefsRow.default_lead_days,
        email: prefsRow.email,
      },
      onboarded: prefsRow.onboarded,
    };
  }

  async insertItems(items: Item[]) {
    const { error } = await this.db.from("lp_items").insert(items.map((it) => itemToRow(it, this.userId)));
    if (error) throw error;
  }
  async upsertItem(item: Item) {
    const { error } = await this.db.from("lp_items").update(itemToRow(item, this.userId)).eq("id", item.id);
    if (error) throw error;
  }
  async deleteItem(id: string) {
    const { error } = await this.db.from("lp_items").delete().eq("id", id);
    if (error) throw error;
  }
  async insertAudit(events: AuditEvent[]) {
    const { error } = await this.db.from("lp_audit").insert(events.map((ev) => auditToRow(ev, this.userId)));
    if (error) throw error;
  }
  async savePrefs(prefs: NotificationPrefs, onboarded: boolean) {
    const { error } = await this.db.from("lp_prefs").update({
      due_soon_alerts: prefs.dueSoonAlerts,
      weekly_digest: prefs.weeklyDigest,
      default_lead_days: prefs.defaultLeadDays,
      email: prefs.email,
      onboarded,
      updated_at: new Date().toISOString(),
    }).eq("user_id", this.userId);
    if (error) throw error;
  }
  async deleteAllItems() {
    const { error } = await this.db.from("lp_items").delete().eq("user_id", this.userId);
    if (error) throw error;
  }
}

/* --------------------------------- Store ----------------------------------- */

/** Human-facing reason for a rejected write, mapped from backend errors. */
export type WriteErrorKind = "free_limit" | "generic";

export class Store {
  private db: UserDB;
  private actor: string;
  private backend: StoreBackend;
  private local: LocalBackend | null = null;
  private listeners = new Set<() => void>();
  private errorListeners = new Set<(kind: WriteErrorKind) => void>();

  constructor(userId: string, email: string) {
    this.actor = email;
    this.db = emptyDB(email);
    if (supabase) {
      this.backend = new SupabaseBackend(supabase, userId, email);
    } else {
      const local = new LocalBackend(`wirby:data:${userId}`, email);
      this.local = local;
      this.backend = local;
    }
  }

  async init(): Promise<void> {
    try {
      this.db = await this.backend.load();
    } catch (err) {
      console.error("[Wirby] Failed to load data:", err);
      this.db = emptyDB(this.actor);
    }
    this.local?.bind(this.db);
    this.emit();
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  /** Subscribe to backend write failures so the UI can show a real message. */
  onWriteError = (fn: (kind: WriteErrorKind) => void): (() => void) => {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  };

  private emitError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const kind: WriteErrorKind = /FREE_LIMIT_REACHED|free.?limit/i.test(msg) ? "free_limit" : "generic";
    for (const fn of this.errorListeners) fn(kind);
  }

  snapshot = (): UserDB => this.db;

  private emit() {
    this.local?.bind(this.db);
    for (const fn of this.listeners) fn();
  }

  /** Reload from the backend so the optimistic snapshot reconverges after a write error. */
  private async resync() {
    try {
      this.db = await this.backend.load();
      this.emit();
    } catch (err) {
      console.error("[Wirby] Resync failed:", err);
    }
  }

  private makeEvent(action: AuditAction, opts: { targetId?: string; targetTitle?: string; detail?: string }): AuditEvent {
    return { id: crypto.randomUUID(), at: new Date().toISOString(), actor: this.actor, action, ...opts };
  }

  log(action: AuditAction, opts: { targetId?: string; targetTitle?: string; detail?: string } = {}) {
    const ev = this.makeEvent(action, opts);
    this.db = { ...this.db, audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP) };
    this.emit();
    this.backend.insertAudit([ev]).catch((err) => console.error("[Wirby] audit write failed:", err));
  }

  addItems(items: Item[], action: AuditAction = "item.created") {
    const events = items.map((it) =>
      this.makeEvent(action, {
        targetId: it.id,
        targetTitle: it.title,
        detail: it.source.type === "manual" ? "added manually" : `from ${it.source.type}`,
      }),
    );
    this.db = {
      ...this.db,
      items: [...items, ...this.db.items],
      audit: [...events, ...this.db.audit].slice(0, AUDIT_CAP),
    };
    this.emit();
    Promise.all([this.backend.insertItems(items), this.backend.insertAudit(events)]).catch((err) => {
      console.error("[Wirby] add items failed:", err);
      this.emitError(err);
      void this.resync();
    });
  }

  updateItem(id: string, patch: Partial<Item>, action: AuditAction, detail?: string) {
    let updated: Item | undefined;
    this.db = {
      ...this.db,
      items: this.db.items.map((it) => {
        if (it.id !== id) return it;
        updated = { ...it, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    };
    const ev = this.makeEvent(action, { targetId: id, targetTitle: updated?.title, detail });
    this.db = { ...this.db, audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP) };
    this.emit();
    if (!updated) return;
    const item = updated;
    Promise.all([this.backend.upsertItem(item), this.backend.insertAudit([ev])]).catch((err) => {
      console.error("[Wirby] update item failed:", err);
      void this.resync();
    });
  }

  deleteItem(id: string) {
    const it = this.db.items.find((i) => i.id === id);
    const ev = this.makeEvent("item.deleted", { targetId: id, targetTitle: it?.title });
    this.db = {
      ...this.db,
      items: this.db.items.filter((i) => i.id !== id),
      audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP),
    };
    this.emit();
    Promise.all([this.backend.deleteItem(id), this.backend.insertAudit([ev])]).catch((err) => {
      console.error("[Wirby] delete item failed:", err);
      void this.resync();
    });
  }

  setPrefs(prefs: NotificationPrefs) {
    this.db = { ...this.db, prefs };
    const ev = this.makeEvent("prefs.updated", {});
    this.db = { ...this.db, audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP) };
    this.emit();
    Promise.all([this.backend.savePrefs(prefs, this.db.onboarded), this.backend.insertAudit([ev])]).catch((err) => {
      console.error("[Wirby] save prefs failed:", err);
      void this.resync();
    });
  }

  setOnboarded() {
    this.db = { ...this.db, onboarded: true };
    const ev = this.makeEvent("onboarding.completed", {});
    this.db = { ...this.db, audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP) };
    this.emit();
    Promise.all([this.backend.savePrefs(this.db.prefs, true), this.backend.insertAudit([ev])]).catch((err) => {
      console.error("[Wirby] set onboarded failed:", err);
      void this.resync();
    });
  }

  clearAll() {
    const ev = this.makeEvent("data.cleared", { detail: "all items removed by user" });
    this.db = { ...this.db, items: [], audit: [ev, ...this.db.audit].slice(0, AUDIT_CAP) };
    this.emit();
    Promise.all([this.backend.deleteAllItems(), this.backend.insertAudit([ev])]).catch((err) => {
      console.error("[Wirby] clear all failed:", err);
      void this.resync();
    });
  }
}
