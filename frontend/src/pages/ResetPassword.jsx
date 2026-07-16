import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (!token) {
      setError('Thiếu token. Mở link từ email.');
      return;
    }
    setLoading(true);
    try {
      const d = await authApi.resetPassword({ token, password });
      setMsg(d.message || 'Đổi mật khẩu thành công');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card shadow-soft">
        <h1 className="text-2xl font-extrabold">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
        {!token && (
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Link thiếu token. Vui lòng dùng link trong email hoặc{' '}
            <Link to="/forgot-password" className="font-semibold text-shopee">
              yêu cầu lại
            </Link>
            .
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu mới</label>
            <input
              className="input"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nhập lại</label>
            <input
              className="input"
              type="password"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
          <button className="btn-primary w-full" disabled={loading || !token}>
            {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
