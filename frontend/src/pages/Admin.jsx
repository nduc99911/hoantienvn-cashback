import { useEffect, useState } from 'react';
import { adminApi, blogApi, formatVnd, telegramApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const TABS = [
  ['kpi', 'KPI'],
  ['orders', 'Đơn'],
  ['withdraw', 'Rút tiền'],
  ['import', 'Import CSV'],
  ['clicks', 'Clicks'],
  ['users', 'Users'],
  ['telegram', 'Telegram Bot'],
  ['blog', 'Blog'],
  ['settings', 'Cấu hình'],
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('kpi');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState({});
  const [clicks, setClicks] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('pending_review');
  const [csv, setCsv] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importFilePath, setImportFilePath] = useState(
    'C:\\Users\\nduc9\\Downloads\\AffiliateCommissionReport_202607160810.csv'
  );
  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
  });
  const [msg, setMsg] = useState('');
  const [tgUsers, setTgUsers] = useState([]);
  const [tgStatus, setTgStatus] = useState(null);
  const [tgTestId, setTgTestId] = useState('');

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  async function load() {
    const [s, o, w, st, c, u] = await Promise.all([
      adminApi.stats(),
      adminApi.orders(filter || undefined),
      adminApi.withdrawals(),
      adminApi.settings(),
      adminApi.clicks(),
      adminApi.users(),
    ]);
    setStats(s);
    setOrders(o.orders);
    setWithdrawals(w.withdrawals);
    setSettings(st.settings || {});
    setClicks(c.clicks || []);
    setUsers(u.users || []);
    try {
      const b = await blogApi.adminAll();
      setPosts(b.posts || []);
    } catch {
      /* ignore */
    }
    try {
      const [tu, ts] = await Promise.all([
        telegramApi.linkedUsers(),
        telegramApi.status(),
      ]);
      setTgUsers(tu.users || []);
      setTgStatus(ts);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [filter]);

  async function act(fn, okMsg) {
    setMsg('');
    try {
      await fn();
      setMsg(okMsg);
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Panel</h1>
        <p className="text-sm text-slate-500">
          Hold {stats?.holdDays || 7} ngày · Affiliate{' '}
          {stats?.setup?.affiliateId || '—'} · an_redir
        </p>
      </div>

      {msg && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              tab === id
                ? 'bg-shopee text-white'
                : 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kpi' && stats && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Mini label="Users" v={stats.users} />
            <Mini label="Chờ duyệt" v={stats.pendingReview} accent="text-amber-600" />
            <Mini label="Đang hold" v={stats.held} accent="text-purple-600" />
            <Mini label="Rút chờ" v={stats.pendingWithdraw} />
            <Mini label="GMV" v={formatVnd(stats.gmv)} />
            <Mini label="HH ước tính" v={formatVnd(stats.commissionEst)} />
            <Mini label="Cashback đã trả" v={formatVnd(stats.paidCashback)} accent="text-emerald-600" />
            <Mini label="Cashback hold" v={formatVnd(stats.heldCashback)} accent="text-purple-600" />
          </div>
          <div className="card">
            <h3 className="font-bold mb-2">7 ngày gần đây</h3>
            <div className="space-y-1 text-sm">
              {(stats.last7 || []).map((d) => (
                <div key={d.d} className="flex justify-between">
                  <span>{d.d}</span>
                  <span>
                    {d.orders} đơn · {formatVnd(d.cashback)}
                  </span>
                </div>
              ))}
              {!stats.last7?.length && (
                <div className="text-slate-400">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => act(() => adminApi.releaseDue(), 'Đã quét nhả hold đến hạn')}
          >
            Nhả hold đến hạn ngay
          </button>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card !p-0 overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            {[
              ['pending_review', 'Chờ duyệt'],
              ['held', 'Hold'],
              ['paid', 'Đã trả'],
              ['rejected', 'Từ chối'],
              ['', 'Tất cả'],
            ].map(([v, t]) => (
              <button
                key={v || 'all'}
                type="button"
                onClick={() => setFilter(v)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  filter === v ? 'bg-orange-100 text-shopee' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Đơn</th>
                  <th className="px-3 py-2">Hoàn</th>
                  <th className="px-3 py-2">Fraud</th>
                  <th className="px-3 py-2">Click</th>
                  <th className="px-3 py-2">TT</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{o.userName}</div>
                      <div className="text-xs text-slate-400">{o.userEmail}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {o.orderId}
                      <div className="text-slate-400">{formatVnd(o.orderAmount)}</div>
                    </td>
                    <td className="px-3 py-2 text-emerald-600 font-semibold">
                      {formatVnd(o.cashbackAmount)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={o.fraudScore >= 40 ? 'text-red-500 font-bold' : ''}>
                        {o.fraudScore}
                      </span>
                      <div className="text-slate-400 max-w-[100px] truncate">
                        {(o.fraudFlags || []).join(',')}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{o.recentClicks}</td>
                    <td className="px-3 py-2 text-xs">{o.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap space-x-1">
                      {['pending_review', 'pending', 'completed'].includes(o.status) && (
                        <>
                          <button
                            className="text-xs font-semibold text-emerald-600"
                            onClick={() =>
                              act(() => adminApi.approveOrder(o.id), `Hold #${o.id}`)
                            }
                          >
                            Duyệt+Hold
                          </button>
                          <button
                            className="text-xs font-semibold text-red-500"
                            onClick={() =>
                              act(() => adminApi.rejectOrder(o.id), `Từ chối #${o.id}`)
                            }
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                      {o.status === 'held' && (
                        <button
                          className="text-xs font-semibold text-shopee"
                          onClick={() =>
                            act(() => adminApi.releaseOrder(o.id), `Release #${o.id}`)
                          }
                        >
                          Nhả hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="space-y-4">
          {withdrawals.map((w) => (
            <div key={w.id} className="card flex flex-wrap gap-4 items-start">
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold">
                  {w.userName} — {formatVnd(w.amount)}
                </div>
                <div className="text-sm text-slate-500">
                  {w.method === 'bank'
                    ? `${w.bankName} · ${w.bankAccount} · ${w.bankHolder}`
                    : `MoMo ${w.momoPhone}`}{' '}
                  · {w.status}
                </div>
                {w.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn-primary !py-2 !px-3 text-xs"
                      onClick={() =>
                        act(() => adminApi.processWithdraw(w.id, 'paid'), 'Đã chuyển')
                      }
                    >
                      Đã chuyển
                    </button>
                    <button
                      className="btn-secondary !py-2 !px-3 text-xs"
                      onClick={() =>
                        act(
                          () => adminApi.processWithdraw(w.id, 'rejected'),
                          'Từ chối rút'
                        )
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
              {w.vietqrUrl && w.method === 'bank' && (
                <img
                  src={w.vietqrUrl}
                  alt="VietQR"
                  className="h-36 w-36 rounded-xl border border-slate-100 dark:border-slate-700"
                />
              )}
            </div>
          ))}
          {!withdrawals.length && (
            <div className="text-slate-400 text-sm">Chưa có yêu cầu rút</div>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="card space-y-4">
          <h2 className="font-bold">Import báo cáo Shopee Aff</h2>
          <p className="text-sm text-slate-500">
            File chuẩn:{' '}
            <code className="text-xs">AffiliateCommissionReport_*.csv</code> (UTF-8) từ
            portal affiliate.shopee.vn. Hệ thống đọc cột tiếng Việt, gộp nhiều SP/1 đơn,
            map <b>Sub_id1</b> → user, bỏ đơn hủy, hold tự động.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Đường dẫn file trên máy (nhanh)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input font-mono text-xs flex-1"
                value={importFilePath}
                onChange={(e) => setImportFilePath(e.target.value)}
                placeholder="C:\Users\...\Downloads\AffiliateCommissionReport_....csv"
              />
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                onClick={() =>
                  act(async () => {
                    const r = await adminApi.importOrders({
                      filePath: importFilePath,
                      autoHold: true,
                    });
                    setMsg(
                      `Import: ${r.imported} OK · ${r.failed} lỗi · skip ${r.skipped || 0}` +
                        (r.meta?.format ? ` · format=${r.meta.format}` : '')
                    );
                    setImportPreview(null);
                    await load();
                    return r;
                  }, 'Import file xong')
                }
              >
                Import file
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="mb-1 block text-sm font-medium">
              Hoặc dán nội dung CSV
            </label>
            <textarea
              className="input font-mono text-xs min-h-[160px]"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="Dán full AffiliateCommissionReport CSV..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  act(async () => {
                    const p = await adminApi.importPreview(csv);
                    setImportPreview(p);
                    setMsg(
                      `Preview: ${p.totalOrders} đơn · map ${p.mapped} · unmapped ${p.unmapped}`
                    );
                    return p;
                  }, 'Preview xong')
                }
              >
                Xem trước
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  act(async () => {
                    const r = await adminApi.importOrders({ csv, autoHold: true });
                    setMsg(
                      `Import: ${r.imported} OK · ${r.failed} lỗi · skip ${r.skipped || 0}`
                    );
                    await load();
                    return r;
                  }, 'Import CSV xong')
                }
              >
                Import &amp; Hold
              </button>
            </div>
          </div>

          {importPreview && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800">
                Format: {importPreview.meta?.format} · Tổng đơn:{' '}
                {importPreview.totalOrders} · Sample 20 dòng
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-400">
                    <tr>
                      <th className="px-2 py-1">Order</th>
                      <th className="px-2 py-1">Sub</th>
                      <th className="px-2 py-1">Value</th>
                      <th className="px-2 py-1">HH</th>
                      <th className="px-2 py-1">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(importPreview.sample || []).map((s) => (
                      <tr key={s.orderId} className="border-t border-slate-50 dark:border-slate-800">
                        <td className="px-2 py-1 font-mono">{s.orderId}</td>
                        <td className="px-2 py-1">{s.subId || '—'}</td>
                        <td className="px-2 py-1">{formatVnd(s.amount)}</td>
                        <td className="px-2 py-1">{formatVnd(s.commission)}</td>
                        <td className="px-2 py-1">
                          {s.mappedUser ? (
                            <span className="text-emerald-600">
                              {s.mappedUser.name}
                            </span>
                          ) : (
                            <span className="text-red-500">chưa map</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Sub_id1 trên Shopee phải trùng sub_id lúc tạo link (vd{' '}
            <code>U2_DEMO2026</code>). File mẫu hiện tại dùng sub như{' '}
            <code>fb</code>, <code>dangbeo</code> — cần map user hoặc đổi sub_id
            link cho khớp.
          </p>
        </div>
      )}

      {tab === 'clicks' && (
        <div className="card !p-0 overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
            {clicks.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm flex justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {c.userName} · {c.shortCode}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {c.productName} · sub {c.subId}
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {c.createdAt}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'users' && (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Ví</th>
                <th className="px-3 py-2 text-left">Hold</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">{formatVnd(u.balance)}</td>
                  <td className="px-3 py-2">{formatVnd(u.heldBalance)}</td>
                  <td className="px-3 py-2 text-xs">
                    {u.role} / {u.status}
                  </td>
                  <td className="px-3 py-2">
                    {u.role !== 'admin' && (
                      <button
                        className="text-xs font-semibold text-shopee"
                        onClick={() =>
                          act(
                            () =>
                              adminApi.banUser(
                                u.id,
                                u.status === 'banned' ? 'active' : 'banned'
                              ),
                            'Updated'
                          )
                        }
                      >
                        {u.status === 'banned' ? 'Mở khóa' : 'Ban'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'blog' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="card space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                () => blogApi.create(blogForm),
                'Đã đăng bài'
              ).then(() =>
                setBlogForm({ title: '', excerpt: '', content: '' })
              );
            }}
          >
            <h3 className="font-bold">Viết bài</h3>
            <input
              className="input"
              placeholder="Tiêu đề"
              value={blogForm.title}
              onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Mô tả ngắn"
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
            />
            <textarea
              className="input min-h-[140px]"
              placeholder="Nội dung (markdown đơn giản)"
              value={blogForm.content}
              onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
              required
            />
            <button className="btn-primary">Đăng</button>
          </form>
          <div className="card !p-0 overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {posts.map((p) => (
                <li key={p.id} className="px-4 py-3 flex justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{p.title}</div>
                    <div className="text-xs text-slate-400">/{p.slug}</div>
                  </div>
                  <button
                    className="text-xs text-red-500"
                    type="button"
                    onClick={() => act(() => blogApi.remove(p.id), 'Đã xóa')}
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'telegram' && (
        <div className="space-y-4">
          <div className="card space-y-2">
            <h2 className="font-bold text-lg">✈️ Telegram Bot (không cần Zalo OA)</h2>
            {tgStatus?.bot && (
              <p className="text-sm">
                Bot:{' '}
                <a
                  className="font-semibold text-sky-600 underline"
                  href={tgStatus.deepLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{tgStatus.bot.username}
                </a>{' '}
                · mode: {tgStatus.mode}
              </p>
            )}
            <ol className="text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5 space-y-1">
              <li>
                Mở{' '}
                <a
                  href="https://t.me/BotFather"
                  className="text-sky-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  @BotFather
                </a>{' '}
                → <code>/newbot</code> → đặt tên
              </li>
              <li>Copy token dạng <code>123456:ABC-DEF...</code></li>
              <li>
                Dán vào Cấu hình → <b>telegram_bot_token</b> (hoặc file .env) → restart API
              </li>
              <li>
                Local: <code>TELEGRAM_MODE=polling</code> (mặc định, không cần HTTPS)
              </li>
              <li>
                Production webhook (tuỳ chọn):{' '}
                <code className="text-xs">https://DOMAIN/api/telegram/webhook</code>
              </li>
              <li>Chat bot → dán link Shopee / gõ /menu</li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-2">
              <input
                className="input max-w-xs font-mono text-sm"
                placeholder="chat_id test (admin)"
                value={tgTestId}
                onChange={(e) => setTgTestId(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary !py-2 text-sm"
                onClick={() =>
                  act(
                    () => telegramApi.test({ chatId: tgTestId || undefined }),
                    'Đã gửi test Telegram'
                  )
                }
              >
                Test gửi tin
              </button>
            </div>
          </div>
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 font-bold border-b border-slate-100 dark:border-slate-800">
              User đã gắn Telegram ({tgUsers.length})
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {tgUsers.map((u) => (
                <li key={u.id} className="px-4 py-2 text-sm flex justify-between gap-2">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-slate-400">
                      {u.email} · sub {u.affSubId}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {u.telegramId}
                  </div>
                </li>
              ))}
              {!tgUsers.length && (
                <li className="p-6 text-center text-slate-400 text-sm">
                  Chưa có user liên kết
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form
          className="card space-y-3 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => adminApi.updateSettings(settings), 'Đã lưu');
          }}
        >
          {[
            ['shopee_affiliate_id', 'Shopee Affiliate ID'],
            ['hold_days', 'Số ngày hold'],
            ['cashback_share_ratio', 'Tỷ lệ chia cashback'],
            ['default_commission_rate', '% HH mặc định'],
            ['f1_rate', 'F1 rate'],
            ['f2_rate', 'F2 rate'],
            ['min_withdraw', 'Min rút'],
            ['max_claims_per_day', 'Max claim/ngày'],
            ['require_click_before_claim', 'Require click (0/1)'],
            ['hard_block_no_click', 'Block cứng không click (0/1)'],
            ['telegram_bot_token', 'Telegram bot token (BotFather)'],
            ['telegram_chat_id', 'Telegram chat id admin (notify)'],
            ['telegram_bot_enabled', 'Telegram bot bật (0/1)'],
            ['telegram_mode', 'Telegram mode: polling | webhook'],
            ['telegram_welcome', 'Telegram tin chào'],
            ['admin_bank_bin', 'VietQR BIN NH'],
            ['admin_bank_account', 'VietQR STK'],
            ['admin_bank_holder', 'VietQR chủ TK'],
            ['support_zalo', 'Zalo support'],
            ['support_phone', 'Hotline'],
            ['support_email', 'Email support'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                className="input font-mono text-sm"
                value={settings[k] ?? ''}
                onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-sm font-medium">Redirect mode</label>
            <select
              className="input"
              value={settings.redirect_mode || 'shopee_an_redir'}
              onChange={(e) =>
                setSettings({ ...settings, redirect_mode: e.target.value })
              }
            >
              <option value="shopee_an_redir">shopee_an_redir</option>
              <option value="wrapper">wrapper</option>
              <option value="direct">direct</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary">Lưu</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => act(() => adminApi.testTelegram(), 'Đã gửi test Telegram')}
            >
              Test Telegram
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Mini({ label, v, accent }) {
  return (
    <div className="card !py-3">
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div className={`text-xl font-extrabold ${accent || ''}`}>{v}</div>
    </div>
  );
}
