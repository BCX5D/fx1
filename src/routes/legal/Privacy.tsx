import { Link } from "react-router-dom";
import { LegalLayout, LSection, LP, LUl } from "./LegalLayout";

const UPDATED = "July 4, 2026";

export function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated={UPDATED}
      path="/privacy"
      seoDescription="How Wirby collects, stores, and protects your data: what we track, who we share it with (Supabase, Stripe, Resend, Plausible), and how to export or delete everything."
    >
      <LP>
        This policy explains what Wirby ("Wirby", "we", "us") collects when you use
        the Wirby website and app (the "Service"), why, and what control you have
        over it. We built Wirby to store as little as possible while still being
        useful, and this policy tries to be just as direct.
      </LP>
      <LP>
        Wirby is operated by{" "}
        Wirby,
        registered at{" "}
        Bermuda.
        If you have questions about this policy or your data, contact{" "}
        <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>.
      </LP>

      <LSection id="data-we-collect" title="1. What we collect">
        <LP>Wirby collects the minimum needed to run the dashboard:</LP>
        <LUl>
          <li><strong>Account data:</strong> name, email address, and a securely hashed password (or your identity provider's token, if you sign in that way).</li>
          <li><strong>Item data:</strong> whatever you add — titles, vendors, amounts, currencies, due dates, cadence, and notes for bills, subscriptions, renewals, warranties, deadlines, and documents you track.</li>
          <li><strong>Source snippets:</strong> when an item is created from an upload or pasted text, we keep a short excerpt (not the full file) so you can see where the data came from. Uploaded files themselves are parsed in your browser and are not stored on our servers.</li>
          <li><strong>Audit events:</strong> a record of actions on your account (sign-ins, edits, exports, deletions) so you have a readable history of your own account.</li>
          <li><strong>Billing data:</strong> if you upgrade to Wirby Plus, our payment processor Stripe handles your card details directly. We store your subscription status and Stripe customer/subscription identifiers, never your full card number.</li>
          <li><strong>Basic usage analytics:</strong> aggregate, cookieless page-view analytics (see Section 6). We do not use tracking cookies or cross-site advertising identifiers.</li>
        </LUl>
        <LP>
          Wirby does not require or request access to your bank accounts, and there
          is no feature that connects to one.
        </LP>
      </LSection>

      <LSection id="how-we-use-it" title="2. How we use it">
        <LUl>
          <li>To operate the dashboard: show your items, calculate urgency, and send reminders you've opted into.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To process payments and manage your subscription, via Stripe.</li>
          <li>To provide customer support when you contact us.</li>
          <li>To understand aggregate product usage (e.g. which pages are visited) so we can improve the Service — never to build an individual profile of you for advertising.</li>
        </LUl>
        <LP>
          We do not sell your personal data, and we do not use your item data to
          train any machine learning model. Item extraction in Wirby runs on
          deterministic pattern matching in your browser, not on a hosted AI model
          (see the product README for detail) — nothing about your documents is
          sent anywhere to "learn" from it.
        </LP>
      </LSection>

      <LSection id="legal-basis" title="3. Legal basis for processing (EEA / UK users)">
        <LP>
          If you are in the European Economic Area or the UK, our legal bases for
          processing your data under the GDPR are:
        </LP>
        <LUl>
          <li><strong>Contract:</strong> processing your account and item data is necessary to provide the Service you signed up for.</li>
          <li><strong>Legitimate interest:</strong> aggregate analytics and abuse prevention, balanced against your privacy.</li>
          <li><strong>Consent:</strong> optional email reminders and marketing communications, which you can withdraw at any time.</li>
          <li><strong>Legal obligation:</strong> billing records we must keep for tax and accounting purposes.</li>
        </LUl>
      </LSection>

      <LSection id="who-we-share-with" title="4. Who we share it with">
        <LP>
          We use a small number of infrastructure providers ("sub-processors") to
          run Wirby. We do not sell data to anyone, including these providers.
        </LP>
        <LUl>
          <li><strong>Supabase</strong> (database, authentication) — hosted in the EU (Ireland). Supabase's own privacy and security terms apply to data at rest.</li>
          <li><strong>Stripe</strong> (payment processing for Wirby Plus) — handles your card details and billing directly; Wirby never sees or stores full card numbers.</li>
          <li><strong>Resend</strong> (transactional email) — delivers account emails (sign-up confirmation, password reset) and, if you opt in, reminder and weekly-digest emails. Only your email address and the message content are shared.</li>
          <li><strong>Plausible Analytics</strong> (usage analytics) — cookieless, does not track individuals across sites, does not collect IP addresses in a personally identifiable way.</li>
        </LUl>
        <LP>
          We disclose data to authorities only when legally required to do so, and
          we will tell you if we're permitted to.
        </LP>
      </LSection>

      <LSection id="retention" title="5. How long we keep it">
        <LUl>
          <li>Account and item data: kept while your account is active.</li>
          <li>Audit log: capped at the most recent 500 events per account.</li>
          <li>Deleted items: removed immediately and permanently from our primary database when you delete them; they are not recoverable by us afterward.</li>
          <li>Account deletion: when you delete your account, your item data, audit log, and profile are permanently removed within 30 days, except billing records we are legally required to retain for tax purposes.</li>
        </LUl>
      </LSection>

      <LSection id="cookies-analytics" title="6. Cookies and analytics">
        <LP>
          Wirby's app itself does not use tracking cookies. We use{" "}
          <a href="https://plausible.io" target="_blank" rel="noreferrer" className="text-pine-700 underline hover:no-underline">Plausible Analytics</a>,
          a privacy-first analytics tool that does not use cookies and does not
          collect personal data, to understand aggregate traffic to our marketing
          pages. Because no personal data is collected this way, no cookie-consent
          banner is required under current guidance for cookieless analytics tools —
          if that changes, we will add one.
        </LP>
        <LP>
          Signing in uses essential session storage (either a secure session
          cookie or local session state, depending on how you access the Service)
          strictly necessary to keep you logged in. This is not used for tracking.
        </LP>
      </LSection>

      <LSection id="your-rights" title="7. Your rights">
        <LP>Wherever you are, you can, from inside the Service, at any time:</LP>
        <LUl>
          <li><strong>Export</strong> everything you've tracked as CSV or JSON from Settings, in one click.</li>
          <li><strong>Delete</strong> individual items, or your entire account, from Settings.</li>
          <li><strong>Correct</strong> any item or profile detail yourself, directly in the app.</li>
        </LUl>
        <LP>
          If you are in the EEA, UK, or a jurisdiction with similar protections, you
          additionally have the right to request a copy of your data, request
          correction or erasure, object to or restrict certain processing, and lodge
          a complaint with your local data protection authority. Contact{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>{" "}
          for anything the in-app tools don't cover.
        </LP>
      </LSection>

      <LSection id="security" title="8. Security">
        <LUl>
          <li>Passwords are salted and hashed; we never store or see plaintext passwords.</li>
          <li>Data in our database is protected by row-level security so your data is only ever readable by your authenticated account.</li>
          <li>Traffic to Wirby is encrypted in transit (HTTPS).</li>
          <li>Uploaded documents are parsed locally in your browser; only the fields you confirm are saved, and the original file is not uploaded to our servers.</li>
        </LUl>
        <LP>No system is perfectly secure. If we ever have a data breach affecting your personal data, we will notify you as required by applicable law.</LP>
      </LSection>

      <LSection id="children" title="9. Children">
        <LP>
          Wirby is not directed at children under 16, and we do not knowingly
          collect data from them. If you believe a child has created an account,
          contact us and we will delete it.
        </LP>
      </LSection>

      <LSection id="international-transfers" title="10. International data transfers">
        <LP>
          Our primary infrastructure (Supabase) is hosted in the EU (Ireland).
          If you access Wirby from outside the EEA, your data will be transferred
          to and processed in the EEA. Where sub-processors are located outside the
          EEA (for example, Stripe's and Resend's global infrastructure), transfers are governed
          by that provider's own compliance mechanisms (such as Standard
          Contractual Clauses).
        </LP>
      </LSection>

      <LSection id="changes" title="11. Changes to this policy">
        <LP>
          If we make material changes, we will update the date at the top of this
          page and, where required, notify you by email or in-app notice before the
          change takes effect.
        </LP>
      </LSection>

      <LSection id="contact" title="12. Contact">
        <LP>
          Questions, requests, or complaints:{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>.{" "}
          See also our <Link to="/terms" className="text-pine-700 underline hover:no-underline">Terms of Service</Link>{" "}
          and <Link to="/refund-policy" className="text-pine-700 underline hover:no-underline">Refund Policy</Link>.
        </LP>
      </LSection>
    </LegalLayout>
  );
}
