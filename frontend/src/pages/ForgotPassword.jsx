import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const d = await authApi.forgotPassword(email);
      setMsg(d.message || 'Đã gửi hướng dẫn nếu email tồn tại.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card shadow-soft">
        <h1 className="text-2xl font-extrabold">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập email đăng ký — chúng tôi gửi link đặt lại (có hạn 1 giờ).
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {msg && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </div>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-shopee hover:underline">
            ← Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
