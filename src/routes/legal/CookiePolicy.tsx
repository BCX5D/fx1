import { Link } from "react-router-dom";
import { LegalLayout, LSection, LP, LUl } from "./LegalLayout";

const UPDATED = "July 14, 2026";

export function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      updated={UPDATED}
      path="/cookies"
      seoDescription="What cookies and similar technologies Wirby uses (and doesn't), including Plausible Analytics and Cloudflare Turnstile, and why no cookie-consent banner is shown."
    >
      <LP>
        This page explains what cookies and similar storage technologies Wirby
        ("Wirby", "we", "us") uses on the Wirby website and app (the "Service"),
        and why. It supplements our{" "}
        <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>.
      </LP>

      <LSection id="what-is-a-cookie" title="1. What counts as a cookie here">
        <LP>
          A cookie is a small piece of data a website can ask your browser to
          store, then read back on later visits. Similar technologies (local
          storage, session storage) work the same way for consent purposes: if
          they're not strictly necessary to run the Service, we need your
          permission before using them. This page covers both.
        </LP>
      </LSection>

      <LSection id="why-no-banner" title="2. Why you don't see a cookie banner">
        <LP>
          A consent banner is required before setting cookies or similar storage
          that isn't strictly necessary — most commonly analytics or advertising
          cookies that identify or track you. Wirby doesn't set any:
        </LP>
        <LUl>
          <li>Our analytics (Plausible, below) doesn't use cookies at all.</li>
          <li>We don't run advertising, retargeting, or cross-site tracking scripts of any kind.</li>
          <li>Everything else we store is strictly necessary to run the Service (keeping you signed in, remembering your in-progress form), which is exempt from consent under the GDPR/ePrivacy Directive (Art. 5(3)) and equivalent laws.</li>
        </LUl>
        <LP>
          If that ever changes — for example, if we add a service that sets a
          non-essential cookie — we will add a consent banner before it goes
          live, and update this page first.
        </LP>
      </LSection>

      <LSection id="what-we-use" title="3. What we actually use">
        <LUl>
          <li>
            <strong>Session / sign-in state</strong> — strictly necessary. Depending on how
            you access the Service, this is either a secure, httpOnly session cookie
            set by our server, or session state kept in your browser's local storage.
            Either way it only identifies your own logged-in session and isn't used
            for tracking or shared with anyone.
          </li>
          <li>
            <strong>Plausible Analytics</strong> (
            <a href="https://plausible.io" target="_blank" rel="noreferrer" className="text-pine-700 underline hover:no-underline">plausible.io</a>
            ) — aggregate, cookieless page-view analytics on our marketing pages. It
            doesn't use cookies or local storage, doesn't collect personal data, and
            can't track you across sites or visits. Only loaded when configured; see
            our <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> (
            <a href="https://www.cloudflare.com/products/turnstile/" target="_blank" rel="noreferrer" className="text-pine-700 underline hover:no-underline">cloudflare.com</a>
            ) — optional bot-protection challenge on sign-in, sign-up, and password-reset
            forms. When enabled, it may set a short-lived cookie strictly to tell
            whether a challenge already passed, so you're not asked twice; this is a
            security function exempt from consent under the same rule as other
            strictly-necessary cookies. It is not used for advertising or
            cross-site tracking. This feature is currently off by default and only
            active if we turn it on.
          </li>
        </LUl>
      </LSection>

      <LSection id="control" title="4. Controlling cookies and storage">
        <LP>
          Because none of the above is used for tracking or advertising, there's
          nothing here to opt out of. If you'd still like to block storage
          entirely, every modern browser lets you block or clear cookies and site
          data from its settings — doing so may sign you out or require you to
          re-pass a security challenge more often, but won't otherwise affect the
          Service.
        </LP>
      </LSection>

      <LSection id="changes-cookies" title="5. Changes to this page">
        <LP>
          If the cookies or similar technologies we use change, we'll update this
          page and, if consent becomes required, add a banner before the change
          takes effect.
        </LP>
      </LSection>

      <LSection id="contact-cookies" title="6. Contact">
        <LP>
          Questions about this page:{" "}
          <a href="mailto:support@wirby.app" className="text-pine-700 underline hover:no-underline">support@wirby.app</a>.{" "}
          See also our <Link to="/privacy" className="text-pine-700 underline hover:no-underline">Privacy Policy</Link>{" "}
          and <Link to="/terms" className="text-pine-700 underline hover:no-underline">Terms of Service</Link>.
        </LP>
      </LSection>
    </LegalLayout>
  );
}
