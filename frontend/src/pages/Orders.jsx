import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd, walletApi, ORDER_STATUS, publicApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const statusMap = ORDER_STATUS;

export default function Orders() {
  const { refresh } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [d, cfg] = await Promise.all([
        walletApi.orders(),
        publicApi.config().catch(() => ({ demoMode: false })),
      ]);
      setOrders(d.orders);
      setDemoMode(Boolean(cfg.demoMode));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function complete(id) {
    if (!demoMode) return;
    setBusyId(id);
    setMsg('');
    try {
      const r = await walletApi.completeOrder(id);
      setMsg(
        `Đã cộng ${formatVnd(r.order.cashbackAmount)} vào ví. Số dư: ${formatVnd(r.balance)}`
      );
      await load();
      await refresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Lịch sử đơn hàng</h1>
      <p className="mt-1 text-sm text-slate-500">
        Timeline: Chờ duyệt → Hold → Vào ví.
        {demoMode
          ? ' Chế độ DEMO: có thể xác nhận đơn demo để test ví.'
          : ' Đơn thật ghi nhận khi admin import báo cáo Affiliate — không cần bấm xác nhận.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['Chờ duyệt', 'Hold', 'Vào ví'].map((t, i) => (
          <span key={t} className="badge bg-slate-100 dark:bg-slate-800">
            {i + 1}. {t}
          </span>
        ))}
        {demoMode && (
          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            DEMO ON
          </span>
        )}
      </div>

      {msg && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          {msg}
        </div>
      )}

      <div className="mt-6 card overflow-hidden !p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p>Chưa có đơn.</p>
            <p className="text-sm">
              Mua qua{' '}
              <Link
                to="/dashboard"
                className="text-shopee font-semibold hover:underline"
              >
                link hoàn tiền
              </Link>
              {demoMode
                ? ' hoặc tạo « Đơn demo » trên Dashboard.'
                : ' → admin import CSV → đơn hiện tại đây.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Giá trị</th>
                  <th className="px-4 py-3">Hoàn tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời gian</th>
                  {demoMode && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => {
                  const st = statusMap[o.status] || statusMap.pending;
                  const canComplete =
                    demoMode &&
                    o.source === 'demo' &&
                    (o.status === 'pending' ||
                      o.status === 'completed' ||
                      o.status === 'pending_review');
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[220px] truncate">
                          {o.productName || o.orderId}
                        </div>
                        <div className="text-xs text-slate-400">
                          {o.orderId}
                          {o.source === 'demo' ? ' · demo' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">{formatVnd(o.orderAmount)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        +{formatVnd(o.cashbackAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {o.holdUntil ? (
                          <div>
                            Hold đến{' '}
                            {new Date(o.holdUntil).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                        {o.purchaseTime
                          ? new Date(o.purchaseTime).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                      {demoMode && (
                        <td className="px-4 py-3">
                          {canComplete && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-shopee hover:underline"
                              disabled={busyId === o.id}
                              onClick={() => complete(o.id)}
                            >
                              {busyId === o.id ? '...' : 'Xác nhận hoàn tất'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
