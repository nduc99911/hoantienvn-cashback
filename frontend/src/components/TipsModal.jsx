import { useEffect, useState } from 'react';

const TIPS = [
  {
    t: 'Giỏ hàng trống sản phẩm đó',
    d: 'Chưa có món trong giỏ. Click link hoàn tiền rồi mới thêm vào giỏ và thanh toán.',
  },
  {
    t: 'Không bấm link mua khác',
    d: 'Từ lúc mở link đến khi thanh toán xong, đừng click link Shopee/KOL khác.',
  },
  {
    t: 'Mua trong 20–30 phút',
    d: 'Nên thanh toán sớm sau khi mở link hoàn tiền.',
  },
  {
    t: 'Tắt chặn quảng cáo (Adblock)',
    d: 'Adblock có thể làm mất theo dõi — đơn không vào ví.',
  },
  {
    t: 'Hủy rồi đặt lại',
    d: 'Phải lấy link hoàn tiền mới và mua lại từ đầu — không đặt lại thẳng trên app.',
  },
];

const KEY = 'hoantien_tips_seen_v1';
const EVT = 'hoantien_open_tips';

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

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(EVT, onOpen);
    return () => window.removeEventListener(EVT, onOpen);
  }, []);

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
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tips-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2 id="tips-title" className="text-xl font-extrabold">
          5 lưu ý để được hoàn tiền
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Làm đúng để đơn được ghi nhận — chỉ hiện lần đầu (xem lại bất cứ lúc nào).
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
          Đã hiểu — bắt đầu mua
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
  window.dispatchEvent(new Event(EVT));
}
