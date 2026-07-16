import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, formatVnd, walletApi } from '../lib/api';

export default function Withdraw() {
  const { user, refresh, setUser } = useAuth();
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [bankHolder, setBankHolder] = useState(user?.bankHolder || '');
  const [momoPhone, setMomoPhone] = useState(user?.momoPhone || user?.phone || '');
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    walletApi.withdrawals().then((d) => setList(d.withdrawals)).catch(console.error);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      // save payment info to profile
      const profile = await authApi.updateProfile({
        bankName,
        bankAccount,
        bankHolder,
        momoPhone,
      });
      setUser(profile.user);

      await walletApi.withdraw({
        amount: Number(amount),
        method,
        bankName,
        bankAccount,
        bankHolder,
        momoPhone,
      });
      setOk('Đã gửi yêu cầu rút tiền. Admin sẽ xử lý sớm.');
      setAmount('');
      await refresh();
      const d = await walletApi.withdrawals();
      setList(d.withdrawals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Rút tiền</h1>
        <p className="mt-1 text-sm text-slate-500">
          Số dư khả dụng:{' '}
          <b className="text-emerald-600 text-lg">{formatVnd(user?.balance)}</b>
          {' · '}Tối thiểu 50.000đ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Số tiền rút (VNĐ)</label>
            <input
              className="input"
              type="number"
              min={50000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Phương thức</label>
            <div className="flex gap-2">
              {[
                { id: 'bank', label: 'Ngân hàng / VietQR' },
                { id: 'momo', label: 'MoMo' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    method === m.id
                      ? 'border-shopee bg-orange-50 text-shopee'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'bank' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Ngân hàng</label>
                <input
                  className="input"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="VD: VCB, MB, TCB..."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Số tài khoản</label>
                <input
                  className="input"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Chủ tài khoản</label>
                <input
                  className="input"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium">Số điện thoại MoMo</label>
              <input
                className="input"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                required
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {ok && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {ok}
            </div>
          )}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu rút'}
          </button>
        </form>

        <div className="card !p-0 overflow-hidden h-fit">
          <div className="border-b border-slate-100 px-5 py-4 font-bold">
            Lịch sử rút tiền
          </div>
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Chưa có yêu cầu</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((w) => (
                <li key={w.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-semibold">{formatVnd(w.amount)}</div>
                    <div className="text-xs text-slate-400">
                      {w.method} · {new Date(w.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      w.status === 'paid' || w.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : w.status === 'rejected'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
