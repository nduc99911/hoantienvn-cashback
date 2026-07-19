import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkCls = ({ isActive }) =>
  `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[11px] font-semibold leading-tight ${
    isActive ? 'text-shopee' : 'text-slate-500'
  }`;

export default function MobileBottomNav() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95 pb-safe">
      <div className="mx-auto flex max-w-lg">
        <NavLink to="/" end className={linkCls}>
          <span className="text-lg leading-none" aria-hidden>
            🏠
          </span>
          <span className="whitespace-nowrap text-center">Chủ</span>
        </NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                💰
              </span>
              <span className="whitespace-nowrap text-center">Ví</span>
            </NavLink>
            <NavLink to="/orders" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                📦
              </span>
              <span className="whitespace-nowrap text-center">Đơn</span>
            </NavLink>
            <NavLink to="/withdraw" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                🏦
              </span>
              <span className="whitespace-nowrap text-center">Rút</span>
            </NavLink>
            <NavLink to="/claim" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                📝
              </span>
              <span className="whitespace-nowrap text-center">Thiếu</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/guide" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                📖
              </span>
              <span className="whitespace-nowrap text-center">Cách</span>
            </NavLink>
            <NavLink to="/login" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                🔑
              </span>
              <span className="whitespace-nowrap text-center">Vào</span>
            </NavLink>
            <NavLink to="/register" className={linkCls}>
              <span className="text-lg leading-none" aria-hidden>
                ✨
              </span>
              <span className="whitespace-nowrap text-center">Đăng ký</span>
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
