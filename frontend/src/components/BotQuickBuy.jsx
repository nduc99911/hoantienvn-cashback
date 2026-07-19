import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../lib/api';
import { telegramHref, zaloGroupHref } from './CommunityLinks';

/**
 * Banner: user mới biết có thể lấy link / mua nhanh qua bot Tele & Zalo
 */
export default function BotQuickBuy() {
  const [s, setS] = useState(null);

  useEffect(() => {
    publicApi
      .config()
      .then((c) => setS(c.support || {}))
      .catch(() => setS({}));
  }, []);

  const tg = s ? telegramHref(s) : '';
  const zg = s ? zaloGroupHref(s) : '';
  const teleName = s?.telegramBot
    ? `@${String(s.telegramBot).replace(/^@/, '')}`
    : 'Telegram bot';

  return (
    <section className="mx-auto mt-8 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 shadow-soft dark:border-sky-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="border-b border-sky-100 bg-sky-500/10 px-4 py-2 dark:border-sky-900">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            ⚡ Mua hàng nhanh — không cần mở web mỗi lần
          </p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
              Lấy link hoàn tiền ngay trên{' '}
              <span className="text-[#229ED9]">Telegram</span> hoặc{' '}
              <span className="text-blue-600">Zalo</span>
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
              Đã liên kết bot với tài khoản web → chỉ cần{' '}
              <b>dán link Shopee vào chat bot</b> → nhận short link → mở và mua.
              Tiện khi đang lướt app Shopee trên điện thoại.
            </p>
          </div>

          <ol className="grid gap-2 text-left text-xs text-slate-600 sm:grid-cols-3 sm:text-sm dark:text-slate-300">
            <li className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-800/80">
              <span className="font-black text-shopee">1.</span> Đăng ký / login web
              (ví chính)
            </li>
            <li className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-800/80">
              <span className="font-black text-shopee">2.</span> Dashboard → tạo mã →
              bot: <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">/lienket</code>{' '}
              (Tele) hoặc <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">lienket</code>{' '}
              (Zalo)
            </li>
            <li className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-800/80">
              <span className="font-black text-shopee">3.</span> Dán link Shopee vào bot
              → mua bằng short link
            </li>
          </ol>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {tg ? (
              <a
                href={tg}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#1b8bc0] sm:flex-none sm:min-w-[200px]"
              >
                <span aria-hidden>✈️</span>
                Mua nhanh qua Telegram
                <span className="text-xs font-semibold opacity-90">{teleName}</span>
              </a>
            ) : (
              <span className="rounded-xl bg-slate-200 px-4 py-3 text-center text-sm text-slate-500">
                Telegram bot đang cập nhật
              </span>
            )}
            {zg ? (
              <a
                href={zg}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 sm:flex-none sm:min-w-[200px]"
              >
                <span aria-hidden>💬</span>
                Nhóm / chat Zalo
              </a>
            ) : null}
          </div>

          <p className="text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-shopee underline">
              Đăng ký free
            </Link>
            {' · '}
            <Link to="/guide" className="font-semibold text-shopee underline">
              Hướng dẫn liên kết bot
            </Link>
            <br />
            Tele: gửi <b>/lienket 123456</b> · Zalo: gửi <b>lienket 123456</b> (mã 6 số trên
            Dashboard)
          </p>
        </div>
      </div>
    </section>
  );
}
