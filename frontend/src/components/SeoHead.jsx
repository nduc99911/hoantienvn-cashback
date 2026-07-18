import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicApi } from '../lib/api';
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO,
  HOME_FAQ_JSONLD,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  howToGuideJsonLd,
  organizationJsonLd,
  resolvePageSeo,
  softwareAppJsonLd,
  websiteJsonLd,
} from '../lib/seo';

function setMeta(name, content, prop = false) {
  if (content == null || content === '') return;
  const attr = prop ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * SEO theo route + override (blog post, ...).
 * props: title, description, path, keywords, noindex, jsonLd extra, image, type
 */
export default function SeoHead({
  title: titleProp,
  description: descriptionProp,
  path: pathProp,
  keywords: keywordsProp,
  noindex: noindexProp,
  image,
  type = 'website',
  jsonLdExtra,
  articleMeta,
} = {}) {
  const location = useLocation();
  const fromRoute = resolvePageSeo(location.pathname);

  const path = pathProp || fromRoute.path || location.pathname || '/';
  const title = titleProp || fromRoute.title || DEFAULT_SEO.title;
  const description =
    descriptionProp || fromRoute.description || DEFAULT_SEO.description;
  const keywords = keywordsProp || fromRoute.keywords || DEFAULT_SEO.keywords;
  const noindex =
    noindexProp != null ? noindexProp : Boolean(fromRoute.noindex);
  const canonical = absoluteUrl(path);
  const ogImage = image || DEFAULT_OG_IMAGE;

  useEffect(() => {
    document.title = title;
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('author', SITE_NAME);
    setMeta('language', 'Vietnamese');

    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', type === 'article' ? 'article' : 'website', true);
    setMeta('og:url', canonical, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:locale', 'vi_VN', true);
    setMeta('og:site_name', SITE_NAME, true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', ogImage);

    setCanonical(canonical);

    // Base structured data
    const pathNorm = path.length > 1 ? path.replace(/\/$/, '') : path;
    if (pathNorm === '/' || pathNorm === '') {
      setJsonLd('ld-org', organizationJsonLd());
      setJsonLd('ld-website', websiteJsonLd());
      setJsonLd('ld-faq', HOME_FAQ_JSONLD);
      setJsonLd('ld-app', softwareAppJsonLd());
      setJsonLd('ld-howto', null);
      setJsonLd('ld-article', null);
      setJsonLd(
        'ld-breadcrumb',
        breadcrumbJsonLd([{ name: 'Trang chủ', path: '/' }])
      );
    } else if (pathNorm === '/guide') {
      setJsonLd('ld-org', organizationJsonLd());
      setJsonLd('ld-website', null);
      setJsonLd('ld-faq', HOME_FAQ_JSONLD);
      setJsonLd('ld-app', softwareAppJsonLd());
      setJsonLd('ld-howto', howToGuideJsonLd());
      setJsonLd('ld-article', null);
      setJsonLd(
        'ld-breadcrumb',
        breadcrumbJsonLd([
          { name: 'Trang chủ', path: '/' },
          { name: 'Hướng dẫn hoàn tiền Shopee', path: '/guide' },
        ])
      );
    } else if (pathNorm === '/blog') {
      setJsonLd('ld-org', organizationJsonLd());
      setJsonLd('ld-website', null);
      setJsonLd('ld-faq', null);
      setJsonLd('ld-app', null);
      setJsonLd('ld-howto', null);
      setJsonLd('ld-article', null);
      setJsonLd(
        'ld-breadcrumb',
        breadcrumbJsonLd([
          { name: 'Trang chủ', path: '/' },
          { name: 'Blog hoàn tiền Shopee', path: '/blog' },
        ])
      );
    } else if (pathNorm.startsWith('/blog/') && articleMeta) {
      setJsonLd('ld-org', null);
      setJsonLd('ld-website', null);
      setJsonLd('ld-faq', null);
      setJsonLd('ld-app', null);
      setJsonLd('ld-howto', null);
      setJsonLd(
        'ld-article',
        articleJsonLd({
          title,
          description,
          path: pathNorm,
          datePublished: articleMeta.datePublished,
        })
      );
      setJsonLd(
        'ld-breadcrumb',
        breadcrumbJsonLd([
          { name: 'Trang chủ', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: title, path: pathNorm },
        ])
      );
    } else {
      setJsonLd('ld-org', noindex ? null : organizationJsonLd());
      setJsonLd('ld-website', null);
      setJsonLd('ld-faq', null);
      setJsonLd('ld-app', null);
      setJsonLd('ld-howto', null);
      setJsonLd('ld-article', null);
      setJsonLd('ld-breadcrumb', null);
    }

    if (jsonLdExtra) {
      setJsonLd('ld-extra', jsonLdExtra);
    } else {
      setJsonLd('ld-extra', null);
    }

    let cancelled = false;
    publicApi
      .config()
      .then((cfg) => {
        if (cancelled) return;
        if (cfg.gscVerification) {
          setMeta('google-site-verification', cfg.gscVerification);
        }
        // Prefer live siteUrl for og if set, but keep www canonical for SEO
        if (cfg.siteUrl && !pathProp) {
          const base = String(cfg.siteUrl).replace(/\/$/, '');
          // If site is apex, still canonical www for consistency with Vercel redirect
          const liveCanon =
            base.includes('hoantien.pro.vn') && !base.includes('www.')
              ? absoluteUrl(path)
              : `${base}${path === '/' ? '/' : path}`;
          if (liveCanon.startsWith('http')) {
            setMeta('og:url', liveCanon.startsWith(SITE_URL) ? canonical : liveCanon, true);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    title,
    description,
    keywords,
    noindex,
    canonical,
    ogImage,
    type,
    path,
    pathProp,
    jsonLdExtra,
    articleMeta,
  ]);

  return null;
}
