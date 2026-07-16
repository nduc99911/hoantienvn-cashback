import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LinkConverter from '../components/LinkConverter';
import { formatVnd, walletApi, linksApi, telegramApi } from '../lib/api';

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [summary, setSummary] = useState(null);
  const [txs, setTxs] = useState([]);
  const [links, setLinks] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [tg, setTg] = useState(null);
  const [tgBot, setTgBot] = useState(null);
  const [bindCode, setBindCode] = useState('');

  async function load() {
    const [s, t, l] = await Promise.all([
      walletApi.summary(),
      walletApi.transactions(),
      linksApi.mine(),
    ]);
    setSummary(s);
    setTxs(t.transactions);
    setLinks(l.links);
    try {
      const [st, bs] = await Promise.all([
        telegramApi.status(),
        telegramApi.bindStatus(),
      ]);
      setTgBot(st);
      setTg(bs);
    } catch {
      /* ignore */
    }
    await refresh();
  }

  async function genTgCode() {
    setBusy(true);
    try {
      const r = await telegramApi.bindCode();
      setBindCode(r.code);
      setMsg(r.instruction);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createDemoOrder() {
    setBusy(true);
    setMsg('');
    try {
      const r = await walletApi.demoOrder({
        productName: 'Đơn demo — Tai nghe Bluetooth',
        orderAmount: 250000,
        commission: 35000,
      });
      setMsg(`Đã tạo đơn tạm tính +${formatVnd(r.cashback)}. Vào Đơn hàng để xác nhận hoàn tất.`);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500">
        Đang tải ví...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Xin chào, {user?.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mã giới thiệu:{' '}
          <span className="font-mono font-bold text-shopee">{summary.referralCode}</span>
          {' · '}
          Sub ID Shopee:{' '}
          <span className="font-mono font-bold text-shopee">
            {user?.affSubId || `U${user?.id}_${summary.referralCode}`}
          </span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Mua qua link là đủ — không cần form khai báo. Đơn tự map theo Sub ID khi import báo cáo Aff.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Số dư khả dụng"
          value={formatVnd(summary.balance)}
          accent="text-emerald-600"
        />
        <Stat
          label="Đang hold"
          value={formatVnd(summary.heldBalance || summary.heldCashback)}
          accent="text-purple-600"
        />
        <Stat
          label="Chờ duyệt"
          value={formatVnd(summary.pendingBalance)}
          accent="text-amber-600"
        />
        <Stat label="Tổng đơn" value={summary.totalOrders} />
        <Stat
          label="HH giới thiệu"
          value={formatVnd(summary.referralEarn)}
          accent="text-shopee"
        />
      </div>
      <p className="text-xs text-slate-400">
        Hold mặc định {summary.holdDays || 7} ngày sau khi admin duyệt (chống đơn hủy).
      </p>

      <div className="card">
        <h2 className="mb-3 font-bold text-lg">Lấy link hoàn tiền</h2>
        <LinkConverter compact />
      </div>

      {/* Telegram bot */}
      <div className="card border-sky-100 dark:border-sky-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg">✈️ Bot Telegram</h2>
            <p className="text-sm text-slate-500 mt-1">
              Chat bot → dán link Shopee → nhận link hoàn tiền. Không cần Zalo OA.
            </p>
            {tgBot?.deepLink && (
              <a
                href={tgBot.deepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-sm font-semibold text-sky-600 hover:underline"
              >
                Mở @{tgBot.bot?.username || 'bot'} →
              </a>
            )}
            {tg?.linked ? (
              <p className="mt-2 text-sm text-emerald-600 font-semibold">
                ✅ Đã liên kết Telegram
                {tg.telegramName ? ` (${tg.telegramName})` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-600">
                Chưa liên kết — tạo mã rồi gõ bot: <b>/lienket xxxxxx</b>
              </p>
            )}
            {bindCode && (
              <p className="mt-2 font-mono text-xl font-black text-sky-600">
                /lienket {bindCode}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-secondary !py-2 text-sm"
            onClick={genTgCode}
            disabled={busy}
          >
            {tg?.linked ? 'Tạo mã gắn lại' : 'Tạo mã liên kết Telegram'}
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Lệnh: dán link Shopee · /sodu · /subid · /don · /menu
          {!tg?.botEnabled && !tgBot?.enabled && (
            <span className="text-amber-600">
              {' '}
              · Bot chưa bật (admin dán TELEGRAM_BOT_TOKEN)
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn-primary">
          Lấy link mua
        </Link>
        <Link to="/orders" className="btn-secondary">
          Đơn / hold
        </Link>
        <Link to="/withdraw" className="btn-secondary">
          Rút tiền
        </Link>
        <Link to="/claim" className="btn-secondary">
          Báo đơn thiếu
        </Link>
        <button className="btn-secondary" onClick={createDemoOrder} disabled={busy}>
          {busy ? '...' : '🧪 Đơn demo'}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Luồng chính: lấy link (sub_id cố định) → mua → admin import CSV Shopee → hold → ví.
      </p>
      {msg && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-bold">Giao dịch gần đây</h2>
          {txs.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có giao dịch</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {txs.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.description}</div>
                    <div className="text-xs text-slate-400">
                      {t.type} · {t.status} · {new Date(t.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 font-bold ${
                      t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {t.amount >= 0 ? '+' : ''}
                    {formatVnd(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 font-bold">Link đã tạo</h2>
          {links.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có link — dán link Shopee ở trên</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {links.slice(0, 6).map((l) => (
                <li key={l.id} className="py-3">
                  <div className="text-sm font-medium line-clamp-1">{l.productName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Hoàn {formatVnd(l.estimatedCashback)}</span>
                    <span>· {l.clicks} clicks</span>
                    <a
                      href={l.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-shopee font-semibold hover:underline"
                    >
                      Mở link
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${accent || 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
