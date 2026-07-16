import { useEffect, useState } from 'react';
import { publicApi } from '../lib/api';

export default function FloatingSupport() {
  const [s, setS] = useState({ zalo: '', phone: '', messenger: '', facebook: '' });

  useEffect(() => {
    publicApi
      .config()
      .then((c) =>
        setS({
          zalo: c.support?.zalo || '',
          phone: c.support?.phone || '',
          messenger: c.support?.messenger || '',
          facebook: c.support?.facebook || '',
        })
      )
      .catch(() => {});
  }, []);

  const items = [];
  if (s.phone) {
    items.push({
      href: `tel:${s.phone.replace(/\s/g, '')}`,
      label: 'Gọi',
      emoji: '📞',
      cls: 'bg-emerald-500',
    });
  }
  if (s.zalo) {
    items.push({
      href: s.zalo.startsWith('http') ? s.zalo : `https://zalo.me/${s.zalo}`,
      label: 'Zalo',
      emoji: '💬',
      cls: 'bg-sky-500',
    });
  }
  if (s.messenger) {
    items.push({
      href: s.messenger,
      label: 'Chat',
      emoji: '💙',
      cls: 'bg-blue-600',
    });
  } else if (s.facebook) {
    items.push({
      href: s.facebook,
      label: 'FB',
      emoji: '📘',
      cls: 'bg-blue-700',
    });
  }

  if (!items.length) return null;

  return (
    <div className="fixed bottom-20 right-3 z-40 flex flex-col gap-2 md:bottom-6">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noreferrer"
          className={`${it.cls} flex h-12 w-12 items-center justify-center rounded-full text-lg text-white shadow-lg hover:brightness-110`}
          title={it.label}
        >
          {it.emoji}
        </a>
      ))}
    </div>
  );
}
