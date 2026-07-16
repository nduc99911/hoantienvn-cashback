import { Link } from 'react-router-dom';
import LinkConverter from '../components/LinkConverter';

const steps = [
  {
    n: 1,
    t: 'Copy link sản phẩm Shopee',
    d: 'Mở app/web Shopee → sản phẩm → Chia sẻ → Sao chép liên kết.',
  },
  {
    n: 2,
    t: 'Dán vào HoanTienVN',
    d: 'Hệ thống parse shop/item → tạo s.shopee.vn/an_redir với affiliate_id của nền tảng + sub_id của bạn.',
  },
  {
    n: 3,
    t: 'Click short link / an_redir và mua',
    d: 'Giỏ trống SP đó, không click aff khác, thanh toán trong 20–30 phút, tắt Adblock.',
  },
  {
    n: 4,
    t: 'Khai báo mã đơn',
    d: 'Nhận hàng → Tôi → Đơn mua → copy Mã đơn → form Khai báo. Admin đối soát.',
  },
  {
    n: 5,
    t: 'Hold → vào ví → rút',
    d: 'Duyệt xong tiền hold (mặc định 7 ngày) rồi vào số dư khả dụng. Rút bank/MoMo từ 50.000đ.',
  },
];

export default function Guide() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold">Hướng dẫn hoàn tiền</h1>
        <p className="mt-2 text-slate-500">
          Không cần Open API — link an_redir + khai báo đơn + hold an toàn
        </p>
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

      <div className="card shadow-soft">
        <h2 className="font-bold text-lg mb-3">Thử lấy link ngay</h2>
        <LinkConverter />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/register" className="btn-primary">
          Đăng ký miễn phí
        </Link>
        <Link to="/claim" className="btn-secondary">
          Khai báo đơn
        </Link>
        <Link to="/terms" className="btn-secondary">
          Điều khoản
        </Link>
      </div>
    </div>
  );
}
