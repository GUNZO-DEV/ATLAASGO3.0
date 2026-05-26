/**
 * Tiny zero-dependency SEO hook — updates document.title and the key
 * <meta> + <link rel="canonical"> tags whenever a page mounts.
 *
 * Avoids react-helmet's bundle weight. Cleanup restores the previous
 * values when the component unmounts so search-engine bots that don't
 * execute JS (rare these days) and OG card scrapers (which DO execute
 * JS for SSR previews) get the right snapshot.
 */
import { useEffect } from 'react';

type SEO = {
  title?: string;
  description?: string;
  image?: string;
  /** Override canonical URL. Defaults to `${VITE_SITE_URL}${pathname}`. */
  canonical?: string;
  /** Page noindex (e.g. /checkout/:id, /track/:id) */
  noindex?: boolean;
  /** Inject JSON-LD structured data for restaurants, etc. */
  jsonLd?: Record<string, unknown>;
};

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://atlaasgo.com';
const DEFAULT_IMG = `${SITE}/icons/icon-512.png`;
const SITE_NAME = 'AtlaasGo';

export function useSEO(seo: SEO): void {
  useEffect(() => {
    const prevTitle = document.title;
    const prevMeta: Record<string, string | null> = {};

    const fullTitle = seo.title ? `${seo.title} · ${SITE_NAME}` : `${SITE_NAME} — Ifrane's premium delivery, redefined`;
    document.title = fullTitle;

    const setMeta = (key: 'name' | 'property', val: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${val}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(key, val);
        document.head.appendChild(tag);
      }
      const k = `${key}=${val}`;
      if (!(k in prevMeta)) prevMeta[k] = tag.getAttribute('content');
      tag.setAttribute('content', content);
    };

    if (seo.description) {
      setMeta('name', 'description', seo.description);
      setMeta('property', 'og:description', seo.description);
      setMeta('name', 'twitter:description', seo.description);
    }
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:image', seo.image ?? DEFAULT_IMG);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:image', seo.image ?? DEFAULT_IMG);
    setMeta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow');

    // Canonical
    const canon = seo.canonical ?? `${SITE}${window.location.pathname}`;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanon = link?.href ?? null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canon;
    setMeta('property', 'og:url', canon);

    // JSON-LD
    let ld: HTMLScriptElement | null = null;
    if (seo.jsonLd) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.text = JSON.stringify(seo.jsonLd);
      ld.dataset.routeLd = '1';
      document.head.appendChild(ld);
    }

    return () => {
      document.title = prevTitle;
      Object.entries(prevMeta).forEach(([k, content]) => {
        const [key, val] = k.split('=');
        const tag = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${val}"]`);
        if (!tag) return;
        if (content === null) tag.remove();
        else tag.setAttribute('content', content);
      });
      if (link && prevCanon !== null) link.href = prevCanon;
      if (ld) ld.remove();
    };
  }, [seo.title, seo.description, seo.image, seo.canonical, seo.noindex, JSON.stringify(seo.jsonLd ?? null)]);
}
