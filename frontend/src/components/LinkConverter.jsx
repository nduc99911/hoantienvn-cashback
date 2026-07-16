import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatPct, formatVnd, linksApi } from '../lib/api';

export default function LinkConverter({ compact = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);
    if (!url.trim()) {
      setError('Vui lòng dán link sản phẩm Shopee');
      return;
    }
    if (!user) {
      // preview only then prompt login
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1 font-mono text-sm"
            placeholder="Dán link Shopee / TikTok / Lazada..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap sm:min-w-[180px]" disabled={loading}>
            {loading ? 'Đang phân tích...' : 'Lấy Link Hoàn Tiền'}
          </button>
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
      </form>

      {result && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {result.productImage && (
              <img
                src={result.productImage}
                alt=""
                className="h-20 w-20 rounded-xl object-cover bg-white border border-slate-100"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="badge bg-emerald-100 text-emerald-700">
                  Hợp lệ nhận hoàn tiền
                </span>
                {result.noApi !== false && (
                  <span className="badge bg-sky-100 text-sky-700">Không cần API</span>
                )}
                {result.categoryLabel && (
                  <span className="badge bg-slate-100 text-slate-600">
                    {result.categoryLabel}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 line-clamp-2">
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
                {result.shopName && (
                  <span>
                    Shop: <b>{result.shopName}</b>
                  </span>
                )}
                <span>
                  Tỷ lệ hoàn:{' '}
                  <b className="text-shopee">{formatPct(result.cashbackRate)}</b>
                </span>
                <span>
                  Dự kiến:{' '}
                  <b className="text-emerald-600">
                    {result.estimatedCashback != null
                      ? `+${formatVnd(result.estimatedCashback)}`
                      : '—'}
                  </b>
                </span>
              </div>
              {result.dataSource && (
                <div className="mt-1 text-[11px] text-slate-400">
                  Nguồn: {result.dataSource}
                  {result.commissionAmount != null &&
                    ` · HH gốc ~${formatVnd(result.commissionAmount)}`}
                </div>
              )}
            </div>
          </div>

          {result.needLogin ? (
            <div className="border-t border-orange-100 bg-white/60 px-4 py-4">
              <p className="mb-3 text-sm text-slate-600">
                Đăng nhập để lấy link affiliate gắn mã của bạn và theo dõi đơn hoàn tiền.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  onClick={() => navigate('/login', { state: { from: '/', url } })}
                >
                  Đăng nhập để lấy link
                </button>
                <button className="btn-secondary" onClick={() => navigate('/register')}>
                  Đăng ký miễn phí
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-orange-100 bg-white/60 px-4 py-4 space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Short link (rút gọn)
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    readOnly
                    className="input font-mono text-xs"
                    value={result.shortUrl || result.affiliateUrl}
                  />
                  <button type="button" className="btn-secondary" onClick={copyLink}>
                    {copied ? 'Đã copy!' : 'Copy'}
                  </button>
                  <a
                    href={result.affiliateUrl || result.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    Mua ngay
                  </a>
                </div>
              </div>
              {result.affiliateUrl && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Link Shopee an_redir (affiliate)
                  </div>
                  <input
                    readOnly
                    className="input font-mono text-[11px]"
                    value={result.affiliateUrl}
                  />
                  {result.subId && (
                    <p className="mt-1 text-xs text-slate-400">
                      sub_id: <code className="text-shopee font-semibold">{result.subId}</code>
                      {result.originLink && (
                        <>
                          {' '}
                          · origin: <code>{result.originLink}</code>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Click short link → Shopee ghi nhận <b>sub_id = mã bạn</b>. Mua trong 20–30
                phút. <b>Không cần khai báo</b> — đơn tự vào khi import báo cáo Affiliate.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
