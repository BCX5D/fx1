import { Link } from "react-router-dom";
import { LegalLayout, LSection, LP, LUl } from "./LegalLayout";

const UPDATED = "July 4, 2026";

export function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      updated={UPDATED}
      path="/refund-policy"
      seoDescription="How refunds and cancellations work for Wirby Plus, including the EU/UK 14-day withdrawal right and what happens after you cancel."
    >
      <LP>
        This policy covers refunds and cancellations for Wirby Plus, our paid
        monthly subscription. It works alongside our{" "}
        <Link to="/terms" className="text-pine-700 underline hover:no-underline">Terms of Service</Link>.
      </LP>

      <LSection id="free-plan" title="1. Free plan">
        <LP>
          Wirby's Free plan never requires payment, so there is nothing to refund
          on it. You can use it for up to 25 tracked items indefinitely.
        </LP>
      </LSection>

      <LSection id="cancelling" title="2. Cancelling Wirby Plus">
        <LUl>
          <li>Cancel anytime from Settings → Manage subscription (Lemon Squeezy's customer portal). Cancellation is immediate to action, but access continues until the end of your current paid billing period.</li>
          <li>We do not charge cancellation fees.</li>
          <li>After cancellation, your account reverts to the Free plan; your existing items stay intact, but the 25-item limit applies to new items going forward.</li>
        </LUl>
      </LSection>

      <LSection id="eu-withdrawal" title="3. Your 14-day withdrawal right (EU/EEA/UK consumers)">
        <LP>
          If you are a consumer in the European Union, EEA, or United Kingdom, you
          have a legal right to withdraw from a new paid subscription within{" "}
          <strong>14 days</strong> of purchase, without giving a reason, under EU
          Directive 2011/83/EU (and equivalent UK law).
        </LP>
        <LP>
          Because Wirby Plus is a digital service that gives you access
          immediately, by starting checkout you can expressly ask us to begin
          providing the Service right away. If you exercise this and later
          request a withdrawal, we will refund a pro-rated amount for the unused
          portion of that first 14-day window — not the whole subscription if
          you've already used part of it — matching how EU rules treat digital
          services that have been partly performed at your request.
        </LP>
        <LP>
          To exercise this right, contact{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>{" "}
          within 14 days of your first payment. We will process eligible refunds
          within 14 days of your request, to your original payment method.
        </LP>
      </LSection>

      <LSection id="outside-eu" title="4. Refunds outside the 14-day EU window">
        <LP>
          Subscription fees are generally non-refundable once a billing period has
          started, except as required by section 3 above or by the law of your
          jurisdiction. If you believe you were charged in error — for example, a
          duplicate charge, a charge after you cancelled, or a technical failure
          that prevented you from using the Service you paid for — contact{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>{" "}
          and we will investigate and issue a refund if the charge was in error.
        </LP>
      </LSection>

      <LSection id="failed-payments" title="5. Failed or disputed payments">
        <LP>
          If a renewal payment fails, we will flag your account as past due and
          attempt to notify you; core features remain available for a short grace
          period before Plus features pause, so you have a chance to update your
          payment method without losing data. Item data is never deleted for a
          failed payment.
        </LP>
        <LP>
          If you dispute a charge directly with your bank or card provider
          ("chargeback") instead of contacting us first, we reserve the right to
          suspend the associated account while the dispute is resolved.
        </LP>
      </LSection>

      <LSection id="how-refunds-are-issued" title="6. How refunds are issued">
        <LP>
          Wirby Plus is billed through Lemon Squeezy, our merchant of record.
          Approved refunds are issued by Lemon Squeezy to your original payment
          method and typically appear within 5–10 business days, depending on
          your bank. We do not issue refunds as account credit unless you request
          that instead.
        </LP>
      </LSection>

      <LSection id="contact-refund" title="7. Contact">
        <LP>
          Billing questions or refund requests:{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>.{" "}
          See also our <Link to="/terms" className="text-pine-700 underline hover:no-underline">Terms of Service</Link>{" "}
          and <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>.
        </LP>
      </LSection>
    </LegalLayout>
  );
}
