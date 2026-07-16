import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkCls = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
    isActive ? 'text-shopee' : 'text-slate-500'
  }`;

export default function MobileBottomNav() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95 pb-safe">
      <div className="mx-auto flex max-w-lg">
        <NavLink to="/" end className={linkCls}>
          <span className="text-lg">🏠</span>
          Trang chủ
        </NavLink>
        <NavLink to="/guide" className={linkCls}>
          <span className="text-lg">📖</span>
          Hướng dẫn
        </NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className={linkCls}>
              <span className="text-lg">💰</span>
              Ví
            </NavLink>
            <NavLink to="/referrals" className={linkCls}>
              <span className="text-lg">👥</span>
              Mời bạn
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkCls}>
              <span className="text-lg">🔑</span>
              Đăng nhập
            </NavLink>
            <NavLink to="/register" className={linkCls}>
              <span className="text-lg">✨</span>
              Đăng ký
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
