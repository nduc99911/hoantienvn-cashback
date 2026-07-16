import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd, walletApi, ORDER_STATUS } from '../lib/api';

const statusMap = ORDER_STATUS;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await walletApi.orders();
      setOrders(d.orders);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Lịch sử đơn hàng</h1>
      <p className="mt-1 text-sm text-slate-500">
        Timeline: Chờ duyệt → Hold → Vào ví. Đơn thật được ghi nhận khi admin import
        báo cáo Affiliate theo sub_id — bạn không cần bấm xác nhận.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['Chờ duyệt', 'Hold', 'Vào ví'].map((t, i) => (
          <span key={t} className="badge bg-slate-100 dark:bg-slate-800">
            {i + 1}. {t}
          </span>
        ))}
      </div>

      <div className="mt-6 card overflow-hidden !p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p>Chưa có đơn.</p>
            <p className="text-sm">
              Mua qua{' '}
              <Link to="/dashboard" className="text-shopee font-semibold hover:underline">
                link hoàn tiền
              </Link>{' '}
              → admin import CSV → đơn hiện tại đây.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => {
                  const st = statusMap[o.status] || statusMap.pending;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[220px] truncate">
                          {o.productName || o.orderId}
                        </div>
                        <div className="text-xs text-slate-400">{o.orderId}</div>
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
                            Hold đến {new Date(o.holdUntil).toLocaleString('vi-VN')}
                          </div>
                        ) : null}
                        {o.purchaseTime
                          ? new Date(o.purchaseTime).toLocaleString('vi-VN')
                          : '—'}
                      </td>
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
