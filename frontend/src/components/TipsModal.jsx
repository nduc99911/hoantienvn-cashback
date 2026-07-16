import { useEffect, useState } from 'react';

const TIPS = [
  {
    t: 'Tạo giỏ hàng trống trước khi mua',
    d: 'Đảm bảo giỏ Shopee/TikTok chưa có sản phẩm đó. Click link hoàn tiền rồi mới thêm vào giỏ và thanh toán.',
  },
  {
    t: 'Không bấm link chia sẻ khác',
    d: 'Từ lúc click link đến khi thanh toán xong, không click link affiliate/KOL khác để tránh ghi đè tracking.',
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
    d: 'Phải quay lại web lấy link mới và click lại từ đầu — không đặt lại trực tiếp trên app.',
  },
];

const KEY = 'hoantien_tips_seen_v1';

export default function TipsModal({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [forceOpen]);

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2 className="text-xl font-extrabold">Lưu ý khi mua hàng hoàn tiền</h2>
        <p className="mt-1 text-sm text-slate-500">
          Làm đúng các bước sau để đơn được ghi nhận.
        </p>
        <ol className="mt-5 space-y-4">
          {TIPS.map((tip, i) => (
            <li key={tip.t} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shopee text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-sm">{tip.t}</div>
                <p className="mt-0.5 text-sm text-slate-500">{tip.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn-primary mt-6 w-full" onClick={dismiss}>
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

export function openTipsAgain() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
