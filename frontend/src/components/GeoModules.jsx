import { Link } from 'react-router-dom';
import { GEO_CITATION_MODULES } from '../lib/geoContent';

/**
 * Module nội dung tối ưu AI citation + Information Gain
 * H2 = câu hỏi · ngay dưới = đoạn 50–150 từ có số liệu
 */
export default function GeoModules({
  title = 'Giải đáp chuyên sâu: hoàn tiền Shopee & cashback',
  limit,
  showCta = true,
}) {
  const items = limit
    ? GEO_CITATION_MODULES.slice(0, limit)
    : GEO_CITATION_MODULES;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-center text-2xl font-extrabold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
        Các mục dưới đây bổ sung chi tiết mà nhiều trang chỉ nói chung — số liệu theo cấu
        hình HoanTienVN (hold ~7 ngày, chia ~70% HH, rút từ 50k).
      </p>
      <div className="mt-8 space-y-6">
        {items.map((m) => (
          <article
            key={m.id}
            id={m.id}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white sm:text-lg">
              {m.h2}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {m.answer}
            </p>
          </article>
        ))}
      </div>
      {showCta && (
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          <Link to="/register" className="btn-primary !py-2 !px-4">
            Đăng ký lấy link hoàn tiền
          </Link>
          <Link to="/guide" className="btn-secondary !py-2 !px-4">
            Xem hướng dẫn đầy đủ
          </Link>
          <Link
            to="/blog/huong-dan-hoan-tien-shopee-tu-a-z-tren-hoantienvn-2026"
            className="btn-secondary !py-2 !px-4"
          >
            Cẩm nang A–Z
          </Link>
        </div>
      )}
    </section>
  );
}
