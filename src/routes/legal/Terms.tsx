import { Link } from "react-router-dom";
import { LegalLayout, LSection, LP, LUl } from "./LegalLayout";

const UPDATED = "July 4, 2026";

export function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated={UPDATED}
      path="/terms"
      seoDescription="The terms governing your use of Wirby: accounts, plans and billing, acceptable use, and what Wirby's reminders can and can't guarantee."
    >
      <LP>
        These Terms of Service ("Terms") govern your use of Wirby, operated by{" "}
        <strong className="text-alert-700">[LAUNCH-BLOCKING PLACEHOLDER: LEGAL ENTITY NAME]</strong>{" "}
        ("Wirby", "we", "us"), including the website at wirby.app and the Wirby
        application (together, the "Service"). By creating an account or using
        the Service, you agree to these Terms. If you do not agree, do not use
        the Service.
      </LP>

      <LSection id="the-service" title="1. What Wirby is">
        <LP>
          Wirby is a personal admin dashboard for tracking bills, subscriptions,
          renewals, warranties, deadlines, and documents, and surfacing what needs
          your attention. Wirby is a tracking and reminder tool. It is not a
          payment service, a bank, a financial advisor, or a bill-pay service:
          Wirby does not move money on your behalf and does not connect to your
          bank accounts.
        </LP>
      </LSection>

      <LSection id="accounts" title="2. Accounts">
        <LUl>
          <li>You must provide accurate information when creating an account and keep your password secure.</li>
          <li>You are responsible for activity that happens under your account.</li>
          <li>You must be at least 16 years old (or the age of digital consent in your country, if higher) to use Wirby.</li>
          <li>One person or household per account; do not share credentials with people outside your household without our written permission.</li>
        </LUl>
      </LSection>

      <LSection id="plans-billing" title="3. Plans and billing">
        <LUl>
          <li><strong>Free plan:</strong> up to 25 tracked items, enforced by the Service. No payment method required.</li>
          <li><strong>Wirby Plus:</strong> a paid monthly subscription billed in advance through our reseller, Paddle.com Market Ltd ("Paddle"). Pricing is shown on the <Link to="/pricing" className="text-pine-700 underline hover:no-underline">Pricing page</Link> and may change with notice; changes apply from your next billing cycle.</li>
          <li>Subscriptions renew automatically each billing period until cancelled.</li>
          <li>You can cancel anytime from Settings via Paddle's customer portal. Cancelling stops future renewals; see our <Link to="/refund-policy" className="text-pine-700 underline hover:no-underline">Refund Policy</Link> for what happens to the current billing period.</li>
          <li>Downgrading from Plus to Free keeps your existing items but new items are subject to the Free plan's 25-item limit going forward.</li>
        </LUl>
      </LSection>

      <LSection id="your-content" title="4. Your content">
        <LP>
          "Your Content" means the items, notes, documents, and any other data you
          add to Wirby. You retain all ownership of Your Content. You grant us a
          limited license to host, process, and display Your Content solely to
          operate the Service for you.
        </LP>
        <LUl>
          <li>You're responsible for having the right to upload or paste any content you add.</li>
          <li>Don't upload unlawful content, content that infringes someone else's rights, or malware.</li>
          <li>You can export (CSV/JSON) or permanently delete Your Content at any time from Settings.</li>
        </LUl>
      </LSection>

      <LSection id="acceptable-use" title="5. Acceptable use">
        <LP>You agree not to:</LP>
        <LUl>
          <li>Use the Service for anything unlawful, or to store or process someone else's personal data without their permission.</li>
          <li>Attempt to gain unauthorized access to other accounts, our infrastructure, or interfere with the Service's normal operation.</li>
          <li>Reverse-engineer, scrape, or resell the Service without our written permission.</li>
          <li>Use the Service to build a competing product using data obtained through it.</li>
        </LUl>
        <LP>We may suspend or terminate accounts that violate this section.</LP>
      </LSection>

      <LSection id="reminders-disclaimer" title="6. Reminders are not a guarantee">
        <LP>
          Wirby's urgency ranking, reminders, and extracted dates/amounts are aids,
          not guarantees. Extraction from uploaded documents or pasted text uses
          pattern matching and may misread a date, amount, or vendor — that's why
          every extracted item is shown to you for confirmation before it saves,
          and low-confidence fields are flagged. You are responsible for verifying
          the accuracy of any item before relying on it, and for paying your bills
          and meeting your deadlines regardless of whether a reminder was shown.
          We are not liable for late fees, lapsed coverage, missed deadlines, or
          other consequences of a missed or inaccurate reminder.
        </LP>
      </LSection>

      <LSection id="third-party" title="7. Third-party services">
        <LP>
          Payments for Wirby Plus are handled by Paddle, who acts as the
          merchant of record and reseller for these subscriptions — Paddle,
          not Wirby, is the seller you are billed by and who handles applicable
          sales tax/VAT on the purchase. Infrastructure is provided by Supabase.
          Both operate under their own respective terms. We are not responsible
          for outages or issues originating from these third-party providers,
          though we will work to restore the Service as quickly as we
          reasonably can.
        </LP>
      </LSection>

      <LSection id="disclaimers" title="8. Disclaimers">
        <LP>
          The Service is provided "as is" and "as available," without warranties
          of any kind, express or implied, including merchantability, fitness for
          a particular purpose, and non-infringement, to the maximum extent
          permitted by law. We do not warrant that the Service will be
          uninterrupted, error-free, or that extraction results will be accurate.
        </LP>
      </LSection>

      <LSection id="liability" title="9. Limitation of liability">
        <LP>
          To the maximum extent permitted by law, Wirby and its operators will not
          be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, data, late fees, or missed
          deadlines, arising from your use of the Service. Our total aggregate
          liability for any claim relating to the Service is limited to the amount
          you paid us in the 12 months before the claim arose, or{" "}
          <strong className="text-alert-700">[LAUNCH-BLOCKING PLACEHOLDER: CURRENCY AND AMOUNT, e.g. USD 50]</strong>{" "}
          if you are on the Free plan.
        </LP>
        <LP>
          Nothing in these Terms limits liability where it cannot lawfully be
          limited, including for gross negligence, willful misconduct, or death or
          personal injury caused by our negligence, where applicable under your
          local law.
        </LP>
      </LSection>

      <LSection id="termination" title="10. Termination">
        <LP>
          You may stop using the Service and delete your account at any time from
          Settings. We may suspend or terminate your account if you materially
          breach these Terms, with notice where reasonably possible. On
          termination, your right to use the Service ends; export your data before
          you close your account, since deletion is permanent.
        </LP>
      </LSection>

      <LSection id="governing-law" title="11. Governing law">
        <LP>
          These Terms are governed by the laws of{" "}
          <strong className="text-alert-700">[LAUNCH-BLOCKING PLACEHOLDER: GOVERNING JURISDICTION, e.g. Ireland]</strong>,
          without regard to conflict-of-law principles, except where local
          consumer-protection law gives you additional rights that cannot be
          waived — those rights are unaffected by this section.
        </LP>
      </LSection>

      <LSection id="changes-terms" title="12. Changes to these Terms">
        <LP>
          We may update these Terms from time to time. Material changes will be
          announced by email or in-app notice at least 14 days before they take
          effect. Continuing to use the Service after that means you accept the
          updated Terms.
        </LP>
      </LSection>

      <LSection id="contact-terms" title="13. Contact">
        <LP>
          Questions about these Terms:{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>.{" "}
          See also our <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>{" "}
          and <Link to="/refund-policy" className="text-pine-700 underline hover:no-underline">Refund Policy</Link>.
        </LP>
      </LSection>
    </LegalLayout>
  );
}
