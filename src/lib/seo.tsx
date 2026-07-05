import { useEffect } from "react";

/**
 * Lightweight per-route SEO tag manager.
 *
 * Why not react-helmet: this app has no SSR/prerendering, so any head
 * library only helps crawlers that execute JavaScript. Google and Bing do;
 * most social-card scrapers (Facebook, Slack, LinkedIn) do not, and will
 * fall back to the static tags in index.html. That's an accepted tradeoff
 * documented in the SEO audit, not an oversight. Adding a full dependency
 * for something this small would be the wrong kind of "SEO plugin."
 *
 * This component mutates <head> directly, once per prop change, and
 * removes nothing another page didn't put there itself (idempotent).
 */

const SITE_URL = "https://wirby.app";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface SeoProps {
  /** Full page title, already including the " – Wirby" suffix where relevant. */
  title: string;
  /** 120–160 char meta description. Must reflect what's actually on the page. */
  description: string;
  /** Path only, e.g. "/pricing". Used to build canonical + og:url. */
  path: string;
  /** Set true for pages that should be crawlable but excluded from the index. */
  noindex?: boolean;
  image?: string;
  /** One or more JSON-LD objects. Must match visible page content exactly. */
  jsonLd?: object | object[];
}

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSONLD_ID = "route-jsonld";

export function Seo({ title, description, path, noindex = false, image = DEFAULT_OG_IMAGE, jsonLd }: SeoProps) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;

    document.title = title;
    setMetaByName("description", description);
    setMetaByName("robots", noindex ? "noindex, follow" : "index, follow");
    setCanonical(url);

    setMetaByProperty("og:title", title);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:url", url);
    setMetaByProperty("og:image", image);
    setMetaByProperty("og:image:width", "1200");
    setMetaByProperty("og:image:height", "630");
    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", title);
    setMetaByName("twitter:description", description);
    setMetaByName("twitter:image", image);

    document.getElementById(JSONLD_ID)?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = JSONLD_ID;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      // Only the JSON-LD block is route-specific enough to remove on unmount;
      // title/meta/canonical get overwritten by the next route's Seo call
      // (or fall back to index.html's defaults on a hard navigation).
      document.getElementById(JSONLD_ID)?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex, image, JSON.stringify(jsonLd)]);

  return null;
}
