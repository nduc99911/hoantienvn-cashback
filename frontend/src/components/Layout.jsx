import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatVnd, notifApi } from '../lib/api';
import CommunityLinks from './CommunityLinks';

const navCls = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-shopee/10 text-shopee'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);

  useEffect(() => {
    if (!user) return;
    notifApi
      .list()
      .then((d) => {
        setUnread(d.unread || 0);
        setNotifs(d.notifications || []);
      })
      .catch(() => {});
  }, [user]);

  async function openBell() {
    setOpenNotif((v) => !v);
    if (!openNotif) {
      try {
        const d = await notifApi.list();
        setNotifs(d.notifications || []);
        setUnread(d.unread || 0);
      } catch {
        /* ignore */
      }
    }
  }

  async function markAll() {
    await notifApi.readAll();
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, isRead: true })));
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-16 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={dark ? '/logo-dark.svg' : '/logo.svg'}
              alt="HoanTienVN"
              className="h-8 w-auto max-w-[180px] sm:h-9"
              height={36}
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={navCls}>
              Trang chủ
            </NavLink>
            <NavLink to="/guide" className={navCls}>
              Cách dùng
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={navCls}>
                  Lấy link & Ví
                </NavLink>
                <NavLink to="/orders" className={navCls}>
                  Đơn hàng
                </NavLink>
                <NavLink to="/withdraw" className={navCls}>
                  Rút tiền
                </NavLink>
                <NavLink to="/referrals" className={navCls}>
                  Mời bạn
                </NavLink>
                <NavLink to="/claim" className={navCls}>
                  Báo thiếu
                </NavLink>
                {(user.role === 'admin' ||
                  user.role === 'super_admin' ||
                  user.role === 'finance' ||
                  user.role === 'support') && (
                  <NavLink to="/admin" className={navCls}>
                    Admin
                  </NavLink>
                )}
              </>
            ) : (
              <NavLink to="/blog" className={navCls}>
                Blog
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="btn-secondary !py-2 !px-3 text-sm"
              title="Đổi theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={openBell}
                  className="btn-secondary !py-2 !px-3 text-sm relative"
                >
                  🔔
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-shopee px-1 text-[10px] text-white">
                      {unread}
                    </span>
                  )}
                </button>
                {openNotif && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className="text-sm font-bold">Thông báo</span>
                      <button type="button" className="text-xs text-shopee" onClick={markAll}>
                        Đọc tất cả
                      </button>
                    </div>
                    {notifs.length === 0 ? (
                      <div className="p-4 text-sm text-slate-400">Chưa có thông báo</div>
                    ) : (
                      notifs.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={`border-b border-slate-50 px-3 py-2 text-sm dark:border-slate-800 ${
                            !n.isRead ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''
                          }`}
                        >
                          <div className="font-semibold">{n.title}</div>
                          <div className="text-xs text-slate-500">{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <>
                <div className="hidden sm:block text-right text-xs">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-shopee font-bold">{formatVnd(user.balance)}</div>
                </div>
                <button onClick={logout} className="btn-secondary !py-2 !px-3 text-sm">
                  Thoát
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary !py-2 !px-3 text-sm">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn-primary !py-2 !px-3 text-sm">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="flex gap-1 overflow-x-auto border-t border-slate-50 px-2 py-2 lg:hidden dark:border-slate-800">
            <NavLink to="/dashboard" className={navCls}>
              Ví
            </NavLink>
            <NavLink to="/claim" className={navCls}>
              Đơn
            </NavLink>
            <NavLink to="/orders" className={navCls}>
              Đơn
            </NavLink>
            <NavLink to="/withdraw" className={navCls}>
              Rút
            </NavLink>
            {user.role === 'admin' && (
              <NavLink to="/admin" className={navCls}>
                Admin
              </NavLink>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <img
                src={dark ? '/logo-dark.svg' : '/logo.svg'}
                alt="HoanTienVN"
                className="mb-3 h-8 w-auto"
              />
              <p className="text-sm text-slate-500 leading-relaxed">
                Hoàn tiền từ hoa hồng affiliate Shopee (an_redir). Tracking short link +
                khai báo mã đơn + hold an toàn.
              </p>
            </div>
            <div>
              <div className="mb-2 font-semibold">Liên kết</div>
              <ul className="space-y-1 text-sm text-slate-500">
                <li>
                  <Link to="/guide" className="hover:text-shopee">
                    Hướng dẫn
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-shopee">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-shopee">
                    Điều khoản
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-shopee">
                    Bảo mật
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-shopee">
                    Cookie
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-semibold">Cộng đồng & hỗ trợ</div>
              <CommunityLinks variant="stack" className="mb-2" />
              <p className="mt-1 text-sm text-slate-500">
                <a href="mailto:hotro@hoantien.vn" className="hover:text-shopee">
                  hotro@hoantien.vn
                </a>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Link Telegram / Zalo chỉnh trong Admin → Cấu hình
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400 dark:border-slate-800">
            © {new Date().getFullYear()} HoanTienVN ·{' '}
            <Link to="/terms" className="hover:text-shopee">
              Điều khoản
            </Link>{' '}
            ·{' '}
            <Link to="/privacy" className="hover:text-shopee">
              Bảo mật
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
