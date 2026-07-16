import { useEffect, useState } from 'react';
import { walletApi } from '../lib/api';

export default function Referrals() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    walletApi.referrals().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  const link = `${window.location.origin}/register?ref=${data.referralCode}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Giới thiệu bạn bè</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhận <b className="text-shopee">5% F1</b> và <b className="text-shopee">2% F2</b>{' '}
          trên tiền hoàn của tuyến dưới — thu nhập trọn đời.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <div className="text-sm font-medium text-slate-500 mb-2">Link mời của bạn</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly className="input font-mono text-sm" value={link} />
            <button className="btn-primary" onClick={copy}>
              {copied ? 'Đã copy!' : 'Copy link'}
            </button>
          </div>
          <div className="mt-4 text-sm">
            Mã giới thiệu:{' '}
            <span className="font-mono text-lg font-bold text-shopee">{data.referralCode}</span>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <div className="text-sm text-slate-500">Số F1 đã mời</div>
          <div className="mt-1 text-4xl font-extrabold text-shopee">{data.f1.length}</div>
          <p className="mt-2 text-xs text-slate-500">
            Mỗi lần F1 / F2 nhận hoàn tiền, bạn nhận thêm hoa hồng tự động.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="font-bold mb-2">F1 — 5%</h3>
          <p className="text-sm text-slate-500">
            Bạn bè đăng ký bằng link/mã của bạn. Mỗi khi họ được hoàn tiền, bạn nhận 5% số
            tiền hoàn đó.
          </p>
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">F2 — 2%</h3>
          <p className="text-sm text-slate-500">
            Người do F1 mời tiếp. Bạn nhận 2% trên hoàn tiền của F2 — thu nhập thụ động 2
            tầng.
          </p>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 font-bold">Danh sách F1</div>
        {data.f1.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Chưa có ai. Chia sẻ link mời để bắt đầu!
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.f1.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-400">
                    {u.email} · tham gia{' '}
                    {new Date(u.joinedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  F2: {u.f2Count}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
