import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowSquareOut, DownloadSimple, Flask, Sparkle, Trash, WarningCircle } from "@phosphor-icons/react";
import { PageHeader } from "../../components/app/PageHeader";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/Field";
import { Switch } from "../../components/ui/Switch";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../state/AuthContext";
import { useDB, useData } from "../../state/DataContext";
import { useToast } from "../../state/ToastContext";
import { exportCSV, exportJSON } from "../../lib/export";
import { sampleItems } from "../../lib/seed";
import { FREE_ITEM_LIMIT, isPlus, openBillingPortal, startPlusCheckout } from "../../lib/billing";
import { fmtDate } from "../../lib/dates";

export function Settings() {
  const { session, deleteAccount } = useAuth();
  const { store, subscription, refreshSubscription } = useData();
  const db = useDB();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefs, setPrefs] = useState(db.prefs);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);

  const plus = isPlus(subscription);

  const goToCheckout = async () => {
    setBillingBusy(true);
    try {
      // Lemon Squeezy redirect flow: the Edge Function builds a hosted checkout
      // and we send the browser to it. We come back to
      // /app/settings?checkout=success, where the effect below polls for the
      // webhook to flip the plan.
      window.location.href = await startPlusCheckout();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not start checkout.", "error");
      setBillingBusy(false);
    }
  };

  // Handle the return from Lemon Squeezy checkout. The subscription is created
  // asynchronously and reported by the webhook, so poll briefly rather than
  // assuming lp_subscriptions is already updated the instant we land back.
  useEffect(() => {
    const status = searchParams.get("checkout");
    if (!status) return;
    if (status === "success") {
      toast("Payment received. Unlocking Plus…");
      // The Realtime subscription in DataContext usually flips this the
      // instant the webhook writes lp_subscriptions (typically ~1-2s after
      // checkout). This poll is just a fallback in case that event is missed
      // (e.g. a dropped websocket), so it can be short.
      refreshSubscription();
      let attempt = 0;
      const timer = setInterval(() => {
        refreshSubscription();
        if (++attempt >= 4) clearInterval(timer);
      }, 1000);
      setSearchParams({}, { replace: true });
      return () => clearInterval(timer);
    }
    if (status === "cancelled") {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, refreshSubscription, setSearchParams, toast]);

  const goToPortal = async () => {
    setBillingBusy(true);
    try {
      window.location.href = await openBillingPortal();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not open billing portal.", "error");
      setBillingBusy(false);
    }
  };

  const dirty = JSON.stringify(prefs) !== JSON.stringify(db.prefs);

  const savePrefs = () => {
    store.setPrefs(prefs);
    toast("Notification preferences saved.");
  };

  const doExport = (format: "csv" | "json") => {
    if (format === "csv") exportCSV(db.items);
    else exportJSON(db.items);
    store.log("data.exported", { detail: `${db.items.length} items as ${format.toUpperCase()}` });
    toast(`Export started: ${db.items.length} items as ${format.toUpperCase()}.`);
  };

  const loadSample = () => {
    store.addItems(sampleItems(), "data.sample_loaded");
    toast("Sample data loaded. Look for the “Sample data” source tag.");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" sub="Preferences, your data, and the exits." />

      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Account</h2>
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <p className="text-[15px] font-medium text-ink">{session?.name}</p>
          <p className="text-sm text-ink-faint">{session?.email}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
            Signed in since {new Date(session?.issuedAt ?? "").toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
          </p>
        </div>
      </section>

      <section aria-labelledby="plan-h" className="mt-10">
        <h2 id="plan-h" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Plan</h2>
        {plus ? (
          <div className="rounded-2xl border border-line bg-panel px-5 py-5">
            <div className="flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-pine-600" aria-hidden />
              <p className="text-[15px] font-medium text-ink">Wirby Plus</p>
            </div>
            <p className="mt-0.5 text-[13px] text-ink-faint">
              Unlimited items{subscription.currentPeriodEnd ? `. Renews ${fmtDate(subscription.currentPeriodEnd.slice(0, 10))}.` : "."}
              {subscription.status === "past_due" && " Your last payment failed, please update your card."}
              {subscription.status === "paused" && " Your subscription is paused."}
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={goToPortal} disabled={billingBusy}>
              <ArrowSquareOut size={15} aria-hidden />
              {billingBusy ? "Opening…" : "Manage subscription"}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-pine-900 px-5 py-5 text-paper shadow-(--shadow-panel)">
            <p className="text-[15px] font-medium">Free plan</p>
            <p className="mt-0.5 text-[13px] text-pine-200">
              {db.items.length} of {FREE_ITEM_LIMIT} items used. Plus is unlimited, with priority extraction for long documents.
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-2xl">$6</span>
              <span className="text-[13px] text-pine-200">/ month</span>
            </div>
            <Button variant="inverse" size="sm" className="mt-4" onClick={goToCheckout} disabled={billingBusy}>
              <Sparkle size={15} aria-hidden />
              {billingBusy ? "Starting…" : "Upgrade to Plus"}
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="notif-h" className="mt-10">
        <h2 id="notif-h" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Reminders</h2>
        <div className="rounded-2xl border border-line bg-panel px-5 py-2">
          <div className="divide-y divide-line">
            <Switch
              checked={prefs.dueSoonAlerts}
              onChange={(v) => setPrefs({ ...prefs, dueSoonAlerts: v })}
              label="Due-soon alerts"
              description="Flag items on the dashboard when they enter their reminder window."
            />
            <Switch
              checked={prefs.weeklyDigest}
              onChange={(v) => setPrefs({ ...prefs, weeklyDigest: v })}
              label="Weekly digest"
              description="A Monday summary of the week ahead: what is due, what renews, what expired."
            />
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <TextInput
                label="Default reminder lead time (days)"
                type="number"
                min={0}
                max={120}
                value={String(prefs.defaultLeadDays)}
                onChange={(e) => setPrefs({ ...prefs, defaultLeadDays: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })}
              />
              <TextInput
                label="Notification email"
                type="email"
                value={prefs.email}
                onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
          Reminders surface in-app and, when you add a notification email above,
          by email: a due-soon alert on the days something needs attention, and
          a weekly digest each Monday.
        </p>
        <Button className="mt-4" onClick={savePrefs} disabled={!dirty}>Save preferences</Button>
      </section>

      <section aria-labelledby="data-h" className="mt-10">
        <h2 id="data-h" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-ink-faint">Your data</h2>
        <div className="rounded-2xl border border-line bg-panel px-5 py-5">
          <p className="text-[15px] font-medium text-ink">Export everything</p>
          <p className="mt-0.5 text-[13px] text-ink-faint">
            {db.items.length} {db.items.length === 1 ? "item" : "items"}, including archived and completed ones.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => doExport("csv")}>
              <DownloadSimple size={15} aria-hidden />
              Download CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => doExport("json")}>
              <DownloadSimple size={15} aria-hidden />
              Download JSON
            </Button>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[15px] font-medium text-ink">Sample data</p>
            <p className="mt-0.5 text-[13px] text-ink-faint">
              Eight realistic items to explore with. Each one is tagged so you can find and remove them.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={loadSample}>
              <Flask size={15} aria-hidden />
              Load sample data
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="danger-h" className="mt-10 pb-10">
        <h2 id="danger-h" className="mb-3 text-[12px] font-semibold uppercase tracking-[0.13em] text-alert-700">Danger zone</h2>
        <div className="rounded-2xl border border-alert-200 bg-panel px-5 py-5">
          <p className="text-[15px] font-medium text-ink">Delete all items</p>
          <p className="mt-0.5 max-w-md text-[13px] leading-relaxed text-ink-faint">
            Removes every item and its history from this account. Your notification
            preferences and the audit record of this deletion are kept.
          </p>
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirmClear(true)}>
            <Trash size={15} aria-hidden />
            Delete all items
          </Button>
        </div>

        <div className="mt-4 rounded-2xl border border-alert-200 bg-panel px-5 py-5">
          <p className="text-[15px] font-medium text-ink">Delete account</p>
          <p className="mt-0.5 max-w-md text-[13px] leading-relaxed text-ink-faint">
            Permanently deletes your account, every item, your audit log, and your
            preferences. This cannot be undone.{" "}
            {plus && "Cancel your Wirby Plus subscription first, from Manage subscription above."}
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => { setDeleteError(""); setDeleteConfirmText(""); setConfirmDeleteAccount(true); }}
          >
            <Trash size={15} aria-hidden />
            Delete my account
          </Button>
        </div>
      </section>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Delete everything?">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          All {db.items.length} items will be permanently removed. Consider downloading
          an export first; the buttons are one section up.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>Keep my items</Button>
          <Button
            variant="danger"
            onClick={() => { store.clearAll(); setConfirmClear(false); toast("All items deleted."); }}
          >
            Delete everything
          </Button>
        </div>
      </Modal>

      <Modal open={confirmDeleteAccount} onClose={() => setConfirmDeleteAccount(false)} title="Delete your account?">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          This permanently removes your account, all {db.items.length} items, your audit
          log, and your preferences. There is no recovery after this. Consider exporting
          your data first; the buttons are further up this page.
        </p>
        {deleteError && (
          <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-alert-200 bg-alert-100 px-4 py-3 text-sm text-alert-800">
            <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
            {deleteError}
          </div>
        )}
        <label htmlFor="delete-confirm" className="mt-5 block text-[13px] font-medium text-ink-soft">
          Type <span className="font-mono text-ink">delete</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
          className="mt-1.5 h-11 w-full rounded-[10px] border border-line-strong bg-panel px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-pine-600 focus:outline-none focus:ring-2 focus:ring-pine-200"
          placeholder="delete"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDeleteAccount(false)}>Keep my account</Button>
          <Button
            variant="danger"
            disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || deleteBusy}
            onClick={async () => {
              setDeleteBusy(true);
              setDeleteError("");
              try {
                await deleteAccount();
                navigate("/", { replace: true });
              } catch (err) {
                setDeleteError(err instanceof Error ? err.message : "Could not delete your account.");
                setDeleteBusy(false);
              }
            }}
          >
            {deleteBusy ? "Deleting…" : "Delete my account permanently"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
