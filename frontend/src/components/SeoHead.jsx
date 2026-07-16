import { useEffect } from 'react';
import { publicApi } from '../lib/api';

const DEFAULTS = {
  title: 'HoanTienVN - Hoàn Tiền Shopee Cashback',
  description:
    'Dán link Shopee, lấy short link hoàn tiền, theo dõi ví F1/F2. Minh bạch hold & rút bank/MoMo.',
};

/**
 * Cập nhật document title / meta description / GSC verification
 */
export default function SeoHead({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  path = '',
}) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name, content, prop = false) => {
      if (!content) return;
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);

    let cancelled = false;
    publicApi
      .config()
      .then((cfg) => {
        if (cancelled) return;
        if (cfg.gscVerification) {
          setMeta('google-site-verification', cfg.gscVerification);
        }
        if (cfg.siteUrl) {
          const url = `${String(cfg.siteUrl).replace(/\/$/, '')}${path || ''}`;
          setMeta('og:url', url, true);
          let link = document.querySelector('link[rel="canonical"]');
          if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
          }
          link.setAttribute('href', url);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [title, description, path]);

  return null;
}
