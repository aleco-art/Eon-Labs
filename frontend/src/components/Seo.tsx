import { useEffect } from "react";
import { siteConfig } from "../config";

type SeoProps = { title: string; description: string; path?: string; jsonLd?: Record<string, unknown> };

function setMeta(property: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${property}"]`);
  if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, property); document.head.append(element); }
  element.content = content;
}

export function Seo({ title, description, path = "/", jsonLd }: SeoProps) {
  useEffect(() => {
    document.title = title; setMeta("description", description); setMeta("og:title", title, "property");
    setMeta("og:description", description, "property"); setMeta("twitter:title", title); setMeta("twitter:description", description);
    if (siteConfig.url) {
      const canonicalUrl = new URL(path, siteConfig.url).toString();
      let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
      canonical.href = canonicalUrl; setMeta("og:url", canonicalUrl, "property");
    }
    document.getElementById("route-json-ld")?.remove();
    if (jsonLd) { const script = document.createElement("script"); script.id = "route-json-ld"; script.type = "application/ld+json"; script.text = JSON.stringify(jsonLd); document.head.append(script); }
    return () => document.getElementById("route-json-ld")?.remove();
  }, [description, jsonLd, path, title]);
  return null;
}
