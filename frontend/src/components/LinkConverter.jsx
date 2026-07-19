import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatPct, formatVnd, linksApi } from '../lib/api';
import CashbackStepsAnim from './CashbackStepsAnim';

/** Nhận diện nền tảng — TikTok/Lazada hiện chưa mở */
function detectLinkPlatform(raw) {
  const s = String(raw || '').toLowerCase();
  if (/tiktok\.com|vt\.tiktok|tokopedia/.test(s)) return 'tiktok';
  if (/lazada\./.test(s)) return 'lazada';
  if (/shopee\.|shope\.ee|shp\.ee/.test(s)) return 'shopee';
  return null;
}

const COMING_SOON = {
  tiktok:
    'TikTok Shop đang phát triển — hiện chỉ hỗ trợ link Shopee. Vui lòng dán link sản phẩm Shopee.',
  lazada:
    'Lazada đang phát triển — hiện chỉ hỗ trợ link Shopee. Vui lòng dán link sản phẩm Shopee.',
};

export default function LinkConverter({ compact = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(''); // thông báo “đang phát triển” (không phải lỗi đỏ)
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setResult(null);
    setCopied(false);
    if (!url.trim()) {
      setError('Hãy dán link sản phẩm Shopee vào ô bên trên');
      return;
    }
    const plat = detectLinkPlatform(url.trim());
    if (plat === 'tiktok' || plat === 'lazada') {
      setInfo(COMING_SOON[plat]);
      return;
    }
    if (!user) {
      setLoading(true);
      try {
        const preview = await linksApi.preview(url.trim());
        setResult({ ...preview, needLogin: true });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const data = await linksApi.convert(url.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    const text = result.shortUrl || result.affiliateUrl;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={compact ? '' : 'card shadow-soft border-orange-100'}>
      {!compact && (
        <div className="mb-5 border-b border-orange-50 pb-5 dark:border-slate-800">
          <CashbackStepsAnim />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="sr-only" htmlFor="product-url">
          Link sản phẩm
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="product-url"
            className="input flex-1 font-mono text-sm"
            placeholder="Dán link Shopee tại đây (chưa hỗ trợ TikTok / Lazada)..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setInfo('');
              setError('');
            }}
            autoComplete="off"
            inputMode="url"
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap sm:min-w-[160px]"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Lấy link hoàn tiền'}
          </button>
        </div>
        {info && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <b>🚧 Đang phát triển:</b> {info}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
      </form>

      {result && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/40 dark:from-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {result.productImage && (
              <img
                src={result.productImage}
                alt=""
                className="h-20 w-20 rounded-xl object-cover bg-white border border-slate-100"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="badge bg-emerald-100 text-emerald-700">
                  ✓ Có thể nhận hoàn tiền
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 line-clamp-2 dark:text-white">
                {result.productName}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span>
                  Giá:{' '}
                  <b>
                    {result.productPrice != null
                      ? formatVnd(result.productPrice)
                      : 'Đang cập nhật'}
                  </b>
                </span>
                <span>
                  Ước tính hoàn:{' '}
                  <b className="text-emerald-600">
                    {result.estimatedCashback != null
                      ? `~${formatVnd(result.estimatedCashback)}`
                      : formatPct(result.cashbackRate) || '—'}
                  </b>
                </span>
              </div>
            </div>
          </div>

          {result.needLogin ? (
            <div className="border-t border-orange-100 bg-white/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
                Bước tiếp: Đăng nhập để lấy link của bạn
              </p>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                Link sẽ gắn mã riêng — đơn mua sau này cộng vào đúng ví của bạn.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate('/login', { state: { from: '/', url } })
                  }
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/register')}
                >
                  Tạo tài khoản miễn phí
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-orange-100 bg-white/70 px-4 py-4 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <b>Bước tiếp theo:</b> Copy link → mở Shopee → mua trong{' '}
                <b>20–30 phút</b>. Không cần khai báo đơn.
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Link hoàn tiền của bạn
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    className="input font-mono text-xs"
                    value={result.shortUrl || result.affiliateUrl}
                    onFocus={(e) => e.target.select()}
                  />
                  <button type="button" className="btn-secondary" onClick={copyLink}>
                    {copied ? '✓ Đã copy' : 'Copy link'}
                  </button>
                  <a
                    href={result.affiliateUrl || result.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-center"
                  >
                    Mua ngay trên Shopee
                  </a>
                </div>
              </div>
              {result.subId && (
                <p className="text-xs text-slate-400">
                  Mã theo dõi (tự động):{' '}
                  <code className="font-semibold text-shopee">{result.subId}</code>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
