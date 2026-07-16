import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LinkConverter from '../components/LinkConverter';
import TipsModal, { openTipsAgain } from '../components/TipsModal';
import { formatVnd, publicApi, vouchersApi } from '../lib/api';
import CommunityLinks from '../components/CommunityLinks';

const steps = [
  {
    n: '1',
    title: 'Sao chép link sản phẩm',
    desc: 'Mở Shopee/TikTok, chọn sản phẩm và copy đường dẫn chia sẻ.',
  },
  {
    n: '2',
    title: 'Lấy short link & mua hàng',
    desc: 'Dán link → tạo short link tracking. Click link rồi thanh toán trong 20–30 phút.',
  },
  {
    n: '3',
    title: 'Tự nhận hoàn tiền',
    desc: 'Sub ID = mã bạn. Hệ thống import báo cáo Affiliate → hold → vào ví.',
  },
];

const faqs = [
  {
    q: 'Hoàn tiền hoạt động như thế nào?',
    a: 'Bạn dán link sản phẩm, tạo link hoàn tiền, mua qua short link. Khi sàn đối soát hoa hồng, tiền được ghi nhận → hold → vào ví để rút.',
  },
  {
    q: 'Tôi được nhận bao nhiêu?',
    a: 'Thường chia đến 70% hoa hồng (sau các khoản sàn giữ lại). Mức thực tế phụ thuộc ngành hàng và chương trình.',
  },
  {
    q: 'Bao lâu thì ghi nhận đơn?',
    a: 'Sau khi admin import báo cáo Affiliate / đối soát. Tiền hold mặc định vài ngày trước khi rút được.',
  },
  {
    q: 'Vì sao đơn không được ghi nhận?',
    a: 'Có thể do click link khác, thêm SP vào giỏ trước, Adblock, hủy rồi đặt lại không qua link mới, hoặc cookie hết hạn.',
  },
  {
    q: 'Rút tiền thế nào?',
    a: 'Khi số dư ≥ mức tối thiểu, vào Rút tiền, nhập STK/MoMo và gửi yêu cầu. Admin xử lý chuyển khoản.',
  },
];

export default function Home() {
  const [cfg, setCfg] = useState(null);
  const [stats, setStats] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);
  const [estPrice, setEstPrice] = useState('500000');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    publicApi.config().then(setCfg).catch(() => {});
    publicApi.stats().then(setStats).catch(() => {});
    vouchersApi.list().then((d) => setVouchers(d.vouchers || [])).catch(() => {});
  }, []);

  const f1 = ((cfg?.f1Rate ?? 0.2) * 100).toFixed(0);
  const f2 = ((cfg?.f2Rate ?? 0.1) * 100).toFixed(0);
  const share = ((cfg?.cashbackShare ?? 0.7) * 100).toFixed(0);
  const price = Math.max(0, Number(String(estPrice).replace(/\D/g, '')) || 0);
  // Ước tính: giả định HH ~8% × share
  const estComm = Math.round(price * 0.08);
  const estCashback = Math.round(estComm * (cfg?.cashbackShare ?? 0.7));

  async function copyCode(code) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  }

  const videoUrl =
    cfg?.guideVideoUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/videos/huong-dan-hoan-tien.mp4`
      : '/videos/huong-dan-hoan-tien.mp4');
  const ytId = videoUrl.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/)?.[1];
  const isMp4 = /\.mp4($|\?)/i.test(videoUrl) || videoUrl.includes('/videos/');

  return (
    <div className="pb-16 md:pb-0">
      <TipsModal />

      {/* Hero */}
      <section className="hero-bg border-b border-orange-100/50">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold text-shopee shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Chia {share}% hoa hồng · Shopee & TikTok Shop
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight dark:text-white">
              Mua sắm thông minh —{' '}
              <span className="bg-gradient-to-r from-shopee to-brand-500 bg-clip-text text-transparent">
                nhận lại tiền hoàn
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 leading-relaxed dark:text-slate-300">
              Dán link Shopee/TikTok → short link tracking. Mua như bình thường — đối soát
              qua báo cáo Affiliate. Giới thiệu F1 <b>{f1}%</b> · F2 <b>{f2}%</b>.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <LinkConverter />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                openTipsAgain();
                window.location.reload();
              }}
              className="font-semibold text-shopee hover:underline"
            >
              Lưu ý khi sử dụng
            </button>
            <span className="text-slate-300">·</span>
            <Link to="/guide" className="font-semibold text-shopee hover:underline">
              Hướng dẫn lấy link
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/register" className="font-semibold text-shopee hover:underline">
              Đăng ký miễn phí
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Tham gia cộng đồng
            </p>
            <CommunityLinks />
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
            <Stat label="Lượt click link" v={(stats.clicks || 0).toLocaleString('vi-VN')} />
            <Stat label="Thành viên" v={(stats.members || 0).toLocaleString('vi-VN')} />
            <Stat label="Đã chi hoàn" v={formatVnd(stats.paidCashback)} />
            <Stat label="Đang hold" v={formatVnd(stats.heldCashback)} />
          </div>
        </section>
      )}

      {/* Estimator P2 */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="card border-orange-100 bg-gradient-to-br from-orange-50/80 to-white dark:from-slate-900 dark:to-slate-900">
          <h2 className="text-xl font-extrabold">Kiểm tra số tiền được hoàn (ước tính)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Giả định hoa hồng sàn ~8% × chia sẻ {share}% — chỉ mang tính tham khảo.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Giá sản phẩm (đ)</label>
              <input
                className="input"
                inputMode="numeric"
                value={estPrice}
                onChange={(e) => setEstPrice(e.target.value)}
              />
            </div>
            <div className="rounded-2xl bg-white px-5 py-3 shadow-sm dark:bg-slate-800">
              <div className="text-xs text-slate-400">Ước tính hoàn</div>
              <div className="text-2xl font-extrabold text-shopee">
                {formatVnd(estCashback)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vouchers P0 */}
      {vouchers.length > 0 && (
        <section className="bg-slate-50 py-12 dark:bg-slate-950">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-shopee">
                Ưu đãi hot
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">Mã khuyến mãi Shopee</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className="card border-dashed border-2 border-orange-200 !p-4"
                >
                  <div className="text-xs font-bold text-shopee">
                    {v.discountLabel || 'VOUCHER'}
                  </div>
                  <div className="mt-1 font-bold">{v.title}</div>
                  {v.description && (
                    <p className="mt-1 text-xs text-slate-500">{v.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-sm font-mono font-bold dark:bg-slate-800">
                      {v.code}
                    </code>
                    <button
                      type="button"
                      className="btn-primary !py-2 !px-3 text-xs"
                      onClick={() => copyCode(v.code)}
                    >
                      {copiedCode === v.code ? 'Đã chép' : 'Copy'}
                    </button>
                  </div>
                  {typeof v.usedPercent === 'number' && v.usedPercent > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-shopee"
                        style={{ width: `${Math.min(100, v.usedPercent)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Referral highlight P2 */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-shopee">Chương trình giới thiệu</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            Giới thiệu một lần — nhận hoa hồng lâu dài
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card border-orange-100">
            <div className="text-4xl font-black text-shopee">{f1}%</div>
            <div className="mt-1 font-bold">F1 — người bạn mời trực tiếp</div>
            <p className="mt-2 text-sm text-slate-500">
              Ví dụ F1 nhận hoàn 100.000đ → bạn nhận {f1}.000đ (tỷ lệ hiện tại).
            </p>
          </div>
          <div className="card">
            <div className="text-4xl font-black text-slate-800 dark:text-slate-100">
              {f2}%
            </div>
            <div className="mt-1 font-bold">F2 — người do F1 mời tiếp</div>
            <p className="mt-2 text-sm text-slate-500">
              Thu nhập thụ động 2 tầng khi tuyến dưới mua sắm qua link hoàn tiền.
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link to="/referrals" className="btn-primary">
            Mở trang giới thiệu
          </Link>
        </div>
      </section>

      {/* Steps + video */}
      <section className="border-y border-slate-100 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold">3 bước nhận hoàn tiền</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-shopee text-white font-bold">
                  {s.n}
                </div>
                <div className="mt-3 font-bold">{s.title}</div>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
          {(ytId || isMp4) && (
            <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl shadow-soft aspect-video bg-black">
              {ytId ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title="Hướng dẫn lấy link hoàn tiền"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  className="h-full w-full"
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  poster="/logo-app.jpg"
                >
                  Trình duyệt không hỗ trợ video.
                </video>
              )}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-slate-400">
            Video 3 bước · có thể thay bằng YouTube trong Admin → guide_video_url
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold">Câu hỏi thường gặp</h2>
        <div className="mt-8 space-y-2">
          {faqs.map((f, i) => (
            <div
              key={f.q}
              className="rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-sm"
                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              >
                {f.q}
                <span className="text-slate-400">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <p className="border-t border-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16 text-center">
        <Link to="/blog" className="font-semibold text-shopee hover:underline">
          Xem blog mẹo săn sale →
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, v }) {
  return (
    <div className="text-center">
      <div className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
        {v}
      </div>
      <div className="mt-0.5 text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
