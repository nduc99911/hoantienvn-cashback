import LinkConverter from '../components/LinkConverter';
import { Link } from 'react-router-dom';

const steps = [
  {
    n: '1',
    title: 'Sao chép link sản phẩm',
    desc: 'Mở Shopee, chọn sản phẩm yêu thích và copy đường dẫn chia sẻ.',
  },
  {
    n: '2',
    title: 'Lấy short link & mua hàng',
    desc: 'Dán link → hệ thống tạo short link tracking. Click link rồi thanh toán trên Shopee.',
  },
  {
    n: '3',
    title: 'Tự nhận hoàn tiền',
    desc: 'Sub ID trên Shopee Aff = mã bạn. Admin import báo cáo → hold → vào ví. Không form dài.',
  },
];

const notes = [
  {
    t: 'Giỏ hàng trống sản phẩm đó',
    d: 'Đảm bảo giỏ chưa có sản phẩm. Click link hoàn tiền rồi mới thêm vào giỏ và thanh toán.',
  },
  {
    t: 'Không bấm link chia sẻ khác',
    d: 'Từ lúc click link đến khi thanh toán xong, không click link affiliate khác để tránh ghi đè tracking.',
  },
  {
    t: 'Thanh toán trong 20–30 phút',
    d: 'Cookie theo dõi có thời hạn. Nên hoàn tất đơn nhanh sau khi mở link.',
  },
  {
    t: 'Tắt Adblock',
    d: 'Trình chặn quảng cáo có thể chặn mã tracking, khiến đơn không được ghi nhận.',
  },
  {
    t: 'Hủy đơn rồi đặt lại',
    d: 'Phải quay lại trang này lấy link mới và click lại từ đầu.',
  },
];

const features = [
  {
    icon: '💰',
    title: 'Hoàn đến 70% hoa hồng',
    desc: 'Nhận lại phần lớn hoa hồng affiliate Shopee chi trả cho mỗi đơn thành công.',
  },
  {
    icon: '👥',
    title: 'Hệ thống 2 tầng F1 · F2',
    desc: 'Giới thiệu bạn bè: +5% từ F1 và +2% từ F2 trên mỗi đơn hoàn tiền của họ.',
  },
  {
    icon: '🏦',
    title: 'Rút bank / MoMo',
    desc: 'Rút từ 50.000đ qua chuyển khoản ngân hàng hoặc ví MoMo.',
  },
  {
    icon: '📝',
    title: 'Không cần API Shopee',
    desc: 'Tracking bằng short link + khai báo mã đơn. Admin duyệt hoặc import CSV từ portal Affiliate.',
  },
];

const timeline = [
  { day: 'Hôm nay', label: 'Mua hàng', desc: 'Click short link, đặt đơn trên Shopee.' },
  { day: 'Nhận hàng', label: 'Khai báo', desc: 'Nhập mã đơn trên web → chờ admin đối soát.' },
  { day: '1–7 ngày', label: 'Có thể rút', desc: 'Duyệt xong → tiền vào ví → rút bank/MoMo.' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-bg border-b border-orange-100/50">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-shopee shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tiền hoàn chia sẻ từ hoa hồng sàn Shopee
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
              Mua sắm Shopee,{' '}
              <span className="bg-gradient-to-r from-shopee to-brand-500 bg-clip-text text-transparent">
                nhận lại tiền hoàn
              </span>{' '}
              dễ dàng
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 leading-relaxed dark:text-slate-300">
              Dán link Shopee → lấy short link (gắn <b>sub_id = mã bạn</b>). Mua như bình
              thường — <b>không cần khai báo đơn</b>. Hệ thống đối soát qua báo cáo Shopee Aff.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <LinkConverter />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="text-lg">🛒</span> Shopee · TikTok · Lazada
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <Link to="/guide" className="font-semibold text-shopee hover:underline">
              Xem hướng dẫn →
            </Link>
            <Link to="/register" className="font-semibold text-shopee hover:underline">
              Đăng ký miễn phí →
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-shopee">
            Lộ trình hoàn tiền
          </p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            Quy trình nhận hoàn tiền siêu tốc
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {timeline.map((t, i) => (
            <div key={t.label} className="card relative overflow-hidden">
              <div className="absolute -right-2 -top-2 text-6xl font-black text-orange-50">
                {i + 1}
              </div>
              <div className="badge bg-orange-100 text-shopee mb-3">{t.day}</div>
              <h3 className="text-lg font-bold">{t.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 steps */}
      <section className="bg-white border-y border-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-shopee">
              Hướng dẫn nhanh
            </p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              Nhận hoàn tiền Shopee trong 3 bước
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="text-center px-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-shopee to-brand-500 text-xl font-black text-white shadow-soft">
                  {s.n}
                </div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Lưu ý quan trọng khi mua hàng hoàn tiền
          </h2>
          <p className="mt-2 text-slate-500">Làm đúng để đơn được ghi nhận 100%</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n, i) => (
            <div key={n.t} className="card flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-shopee">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold">{n.t}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{n.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-300">
              Ưu điểm
            </p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              Tại sao chọn nền tảng của chúng tôi?
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-shopee to-brand-500 p-8 text-center text-white shadow-soft md:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Bắt đầu mua sắm & nhận hoàn tiền ngay
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-orange-50">
            Đăng ký miễn phí, dán link Shopee và tận hưởng cashback minh bạch.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex rounded-xl bg-white px-6 py-3 font-bold text-shopee shadow hover:bg-orange-50"
            >
              Tạo tài khoản
            </Link>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex rounded-xl border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Lấy link ngay
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
