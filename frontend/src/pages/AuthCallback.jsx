import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';

/** Google OAuth: /auth/callback?token=JWT */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const err = params.get('error');
    if (err) {
      navigate(`/login?error=${encodeURIComponent(err)}`, { replace: true });
      return;
    }
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    localStorage.setItem('token', token);
    authApi
      .me()
      .then((d) => {
        setUser(d.user);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login?error=session', { replace: true });
      });
  }, [params, navigate, setUser]);

  return (
    <div className="py-24 text-center text-slate-400">Đang đăng nhập Google…</div>
  );
}
