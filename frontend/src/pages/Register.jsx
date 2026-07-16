import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: params.get('ref') || '',
    captchaAnswer: '',
    /** honeypot — để trống */
    website: '',
  });
  const [captcha, setCaptcha] = useState({ token: '', question: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadCaptcha() {
    try {
      const d = await authApi.captcha();
      setCaptcha({ token: d.captchaToken, question: d.question });
      setForm((f) => ({ ...f, captchaAnswer: '' }));
    } catch (e) {
      setError(e.message || 'Không tải được captcha');
    }
  }

  useEffect(() => {
    loadCaptcha();
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.captchaAnswer.trim()) {
      setError('Vui lòng trả lời captcha');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        referralCode: form.referralCode,
        captchaToken: captcha.token,
        captchaAnswer: form.captchaAnswer,
        website: form.website,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card shadow-soft">
        <h1 className="text-2xl font-extrabold">Đăng ký miễn phí</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tạo tài khoản để lấy link hoàn tiền và theo dõi ví
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          {/* Honeypot — ẩn khỏi user, bot hay điền */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-10000px',
              top: 'auto',
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
          >
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Họ tên</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Số điện thoại</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Mã giới thiệu (tuỳ chọn)
            </label>
            <input
              className="input uppercase"
              value={form.referralCode}
              onChange={(e) => set('referralCode', e.target.value.toUpperCase())}
              placeholder="DEMO2026"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Xác minh (chống spam)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold tabular-nums dark:bg-slate-800">
                {captcha.question || '…'}
              </span>
              <input
                className="input max-w-[120px]"
                inputMode="numeric"
                placeholder="Kết quả"
                value={form.captchaAnswer}
                onChange={(e) => set('captchaAnswer', e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-secondary px-3 py-2 text-sm"
                onClick={loadCaptcha}
              >
                Làm mới
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-shopee hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
