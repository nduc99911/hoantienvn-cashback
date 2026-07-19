import { useEffect, useState } from 'react';
import { publicApi } from '../lib/api';

function telegramHref(support) {
  if (support?.telegram) {
    const t = support.telegram.trim();
    if (t.startsWith('http')) return t;
    return `https://t.me/${t.replace(/^@/, '')}`;
  }
  if (support?.telegramBot) {
    return `https://t.me/${String(support.telegramBot).replace(/^@/, '')}`;
  }
  return '';
}

function zaloGroupHref(support) {
  const z = support?.zaloGroup || support?.zalo || '';
  if (!z) return '';
  if (z.startsWith('http')) return z;
  return `https://zalo.me/${z}`;
}

/**
 * Link cộng đồng Telegram bot + nhóm Zalo (lấy từ Admin / public config)
 */
export default function CommunityLinks({
  variant = 'row',
  className = '',
  showLabels = true,
}) {
  const [s, setS] = useState(null);

  useEffect(() => {
    publicApi
      .config()
      .then((c) => setS(c.support || {}))
      .catch(() => setS({}));
  }, []);

  if (!s) return null;

  const tg = telegramHref(s);
  const zg = zaloGroupHref(s);
  if (!tg && !zg) return null;

  const tgLabel = s.telegramBot
    ? `@${String(s.telegramBot).replace(/^@/, '')}`
    : 'Telegram Bot';

  const wrap =
    variant === 'stack'
      ? 'flex flex-col gap-2'
      : 'flex flex-wrap items-center gap-2';

  return (
    <div className={`${wrap} ${className}`}>
      {tg && (
        <a
          href={tg}
          target="_blank"
          rel="noreferrer"
          title="Dán link Shopee vào bot để lấy short link hoàn tiền"
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600"
        >
          <span>✈️</span>
          {showLabels && <span>Mua nhanh · {tgLabel}</span>}
        </a>
      )}
      {zg && (
        <a
          href={zg}
          target="_blank"
          rel="noreferrer"
          title="Nhóm Zalo — tip deal & hỗ trợ hoàn tiền"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          <span>💬</span>
          {showLabels && <span>Zalo · hỏi đáp & deal</span>}
        </a>
      )}
    </div>
  );
}

export { telegramHref, zaloGroupHref };
