import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { googleAuthStartUrl, publicApi } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('demo@hoantien.vn');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);

  useEffect(() => {
    if (params.get('error')) setError(params.get('error'));
    publicApi
      .config()
      .then((c) => setGoogleOn(Boolean(c.googleAuthEnabled)))
      .catch(() => {});
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card shadow-soft">
        <h1 className="text-2xl font-extrabold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo: <code className="text-shopee">demo@hoantien.vn</code> / demo123
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
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div className="text-right text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-shopee hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        {googleOn && (
          <a
            href={googleAuthStartUrl()}
            className="btn-secondary mt-3 flex w-full items-center justify-center gap-2"
          >
            <span>G</span> Tiếp tục với Google
          </a>
        )}
        {!googleOn && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Google login: cấu hình GOOGLE_CLIENT_ID/SECRET trên server
          </p>
        )}
        <p className="mt-4 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-shopee hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
