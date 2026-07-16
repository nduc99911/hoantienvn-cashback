import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi, formatVnd, ORDER_STATUS } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Trang "Báo đơn thiếu" — KHÔNG bắt buộc.
 * Luồng chính: link có sub_id = mã user → admin import Shopee → tự ghi nhận.
 */
export default function Claim() {
  const { user, refresh } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [claims, setClaims] = useState([]);
  const [subId, setSubId] = useState(user?.affSubId || '');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const c = await claimsApi.mine();
    setClaims(c.claims || []);
    if (c.subId) setSubId(c.subId);
    if (c.reconcileHint) setHint(c.reconcileHint);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      // Chỉ gửi mã đơn — không cần giá/sản phẩm
      const r = await claimsApi.create({ orderId: orderId.trim() });
      setOk(r.message + (r.reconcileKey ? ` · Key: ${r.reconcileKey}` : ''));
      setOrderId('');
      await load();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = Object.fromEntries(
    Object.entries(ORDER_STATUS).map(([k, v]) => [k, { t: v.label, c: v.cls }])
  );

  const autoOrders = claims.filter((c) => c.auto || c.source === 'import');
  const manualOrders = claims.filter((c) => !c.auto && c.source !== 'import');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Đơn hàng &amp; hoàn tiền</h1>
        <p className="mt-1 text-sm text-slate-500">
          Không cần khai báo dài dòng. Mua qua link → hệ thống nhận diện bằng{' '}
          <b className="text-shopee">Sub ID</b> trên Shopee Affiliate.
        </p>
      </div>

      {/* Sub ID card */}
      <div className="card border-orange-100 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900 dark:border-orange-900">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mã tracking Shopee Aff của bạn (sub_id)
        </div>
        <div className="mt-1 font-mono text-2xl font-black text-shopee tracking-wide">
          {subId || user?.affSubId || '—'}
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Mọi link hoàn tiền đều gắn mã này. Trên portal Shopee Affiliate:
        </p>
        <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-5">
          <li>
            Cột <b>Sub ID</b> = mã user (<code className="text-shopee">{subId}</code>)
          </li>
          <li>
            Cột <b>Order ID</b> = mã đơn hàng
          </li>
          <li>
            Đối soát = <code className="text-xs bg-white dark:bg-slate-800 px-1 rounded">{subId}+ORDER_ID</code>
          </li>
        </ul>
        {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/" className="btn-primary !py-2 !px-4 text-sm">
            Lấy link mua hàng
          </Link>
          <Link to="/orders" className="btn-secondary !py-2 !px-4 text-sm">
            Xem đơn / hold
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { n: '1', t: 'Click link hoàn tiền', d: 'sub_id gắn sẵn mã bạn → Shopee ghi nhận' },
          { n: '2', t: 'Mua & nhận hàng', d: 'Không cần chụp bill / form dài' },
          { n: '3', t: 'Tự vào ví', d: 'Admin import báo cáo Aff → hold → khả dụng' },
        ].map((s) => (
          <div key={s.n} className="card">
            <div className="text-shopee font-black text-xl">{s.n}</div>
            <div className="font-bold mt-1">{s.t}</div>
            <p className="text-sm text-slate-500 mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      {/* Auto orders */}
      <div className="card !p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 font-bold dark:border-slate-800">
          Đơn tự động (từ Shopee Aff)
        </div>
        {autoOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Chưa có đơn import. Mua qua link và chờ đối soát / import báo cáo.
          </div>
        ) : (
          <OrderList items={autoOrders} statusLabel={statusLabel} />
        )}
      </div>

      {/* Optional missing claim */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">Báo đơn thiếu (tuỳ chọn)</h2>
            <p className="text-sm text-slate-500">
              Chỉ dùng nếu sau 3–7 ngày vẫn không thấy đơn. Chỉ cần dán mã đơn.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary !py-2 text-sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Ẩn form' : 'Mở form báo thiếu'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Mã đơn hàng Shopee
              </label>
              <input
                className="input font-mono"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="VD: 240712ABCXYZ"
                required
              />
              <p className="mt-1 text-xs text-slate-400">
                Shopee → Tôi → Đơn mua → chi tiết → Mã đơn hàng. Không cần nhập giá.
              </p>
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {ok && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {ok}
              </div>
            )}
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã đơn thiếu'}
            </button>
          </form>
        )}

        {manualOrders.length > 0 && (
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="text-sm font-semibold mb-2">Đơn đã báo thiếu</div>
            <OrderList items={manualOrders} statusLabel={statusLabel} />
          </div>
        )}
      </div>
    </div>
  );
}

function OrderList({ items, statusLabel }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((c) => {
        const st = statusLabel[c.status] || statusLabel.pending_review;
        return (
          <li key={c.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold">#{c.orderId}</div>
                <div className="text-xs text-slate-500 truncate">{c.productName}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {c.orderAmount > 0 && <>{formatVnd(c.orderAmount)} → </>}
                  hoàn{' '}
                  <b className="text-emerald-600">{formatVnd(c.cashbackAmount)}</b>
                  {c.auto && (
                    <span className="ml-2 badge bg-sky-100 text-sky-700">auto</span>
                  )}
                </div>
              </div>
              <span className={`badge shrink-0 ${st.c}`}>{st.t}</span>
            </div>
            {c.holdUntil && c.status === 'held' && (
              <div className="mt-1 text-xs text-purple-600">
                Hold đến {new Date(c.holdUntil).toLocaleString('vi-VN')}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
