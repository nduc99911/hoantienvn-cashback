import { Link } from 'react-router-dom';
import LinkConverter from '../components/LinkConverter';
import CommunityLinks from '../components/CommunityLinks';

const steps = [
  {
    n: 1,
    t: 'Đăng ký / login web',
    d: 'Tạo tài khoản email hoặc Google trên website — đây là ví chính của bạn.',
  },
  {
    n: 2,
    t: 'Lấy link hoàn tiền',
    d: 'Dán link Shopee trên web, Telegram hoặc Zalo bot (đã liên kết). Hệ thống gắn sub_id của bạn.',
  },
  {
    n: 3,
    t: 'Click link aff và mua',
    d: 'Giỏ trống SP đó, không click aff khác, thanh toán trong 20–30 phút, tắt Adblock.',
  },
  {
    n: 4,
    t: 'Đơn vào ví (auto / import)',
    d: 'Mua đúng link → admin import báo cáo Aff theo sub_id. Có thể báo đơn thiếu nếu cần.',
  },
  {
    n: 5,
    t: 'Hold → rút tiền',
    d: 'Hold mặc định 7 ngày rồi vào số dư. Rút bank/MoMo từ mức tối thiểu trên web.',
  },
];

export default function Guide() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold">Hướng dẫn hoàn tiền</h1>
        <p className="mt-2 text-slate-500">
          Không cần Open API — link an_redir + sub_id + hold an toàn
        </p>
        <div className="mt-4 flex justify-center">
          <CommunityLinks />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {steps.map((s) => (
          <div key={s.n} className="card">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-shopee text-white font-black">
              {s.n}
            </div>
            <h3 className="mt-3 font-bold">{s.t}</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="card shadow-soft space-y-4">
        <h2 className="font-bold text-lg">Liên kết bot Telegram / Zalo</h2>
        <p className="text-sm text-slate-500">
          Để chat bot và website dùng <b>cùng một ví</b>, luôn đăng ký web trước rồi
          gắn bot bằng mã 6 số.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-sky-100 dark:border-sky-900 p-4">
            <h3 className="font-bold text-sky-700 dark:text-sky-300">
              ✈️ Telegram
            </h3>
            <ol className="mt-2 text-sm space-y-1.5 list-decimal list-inside text-slate-600 dark:text-slate-300">
              <li>
                Login web →{' '}
                <Link to="/dashboard" className="text-shopee font-semibold">
                  Dashboard
                </Link>
              </li>
              <li>Bấm « Tạo mã liên kết Telegram »</li>
              <li>
                Mở bot Telegram (nút cộng đồng phía trên / Dashboard) — mặc định{' '}
                <a
                  href="https://t.me/hoantienvn_shopee_bot"
                  className="text-sky-600 font-semibold underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  @hoantienvn_shopee_bot
                </a>
              </li>
              <li>
                Gửi: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/lienket 123456</code>{' '}
                (có dấu <b>/</b>)
              </li>
              <li>Thấy ✅ Đã liên kết → dán link Shopee thoải mái</li>
            </ol>
          </div>
          <div className="rounded-xl border border-blue-100 dark:border-blue-900 p-4">
            <h3 className="font-bold text-blue-700 dark:text-blue-300">
              💬 Zalo
            </h3>
            <ol className="mt-2 text-sm space-y-1.5 list-decimal list-inside text-slate-600 dark:text-slate-300">
              <li>
                Login web →{' '}
                <Link to="/dashboard" className="text-shopee font-semibold">
                  Dashboard
                </Link>
              </li>
              <li>Bấm « Tạo mã liên kết Zalo »</li>
              <li>Kết bạn acc bot Zalo (xem support / admin)</li>
              <li>
                Gửi: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">lienket 123456</code>{' '}
                (<b>không</b> có dấu /)
              </li>
              <li>Thấy ✅ Đã liên kết → cùng ví với web</li>
            </ol>
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Chỉ gõ <b>dangky</b> trên bot mà không lienket → tài khoản ẩn, không đăng
          nhập web được. Muốn web: đăng ký site rồi lienket.
        </p>
      </div>

      <div className="card shadow-soft">
        <h2 className="font-bold text-lg mb-3">Thử lấy link ngay</h2>
        <LinkConverter />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/register" className="btn-primary">
          Đăng ký miễn phí
        </Link>
        <Link to="/dashboard" className="btn-secondary">
          Dashboard / liên kết bot
        </Link>
        <Link to="/claim" className="btn-secondary">
          Báo đơn thiếu
        </Link>
        <Link to="/terms" className="btn-secondary">
          Điều khoản
        </Link>
      </div>
    </div>
  );
}
