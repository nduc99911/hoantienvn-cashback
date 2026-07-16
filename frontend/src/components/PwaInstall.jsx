import { useEffect, useState } from 'react';

export default function PwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches;
    setIos(isIos);

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (isIos) {
      try {
        if (!localStorage.getItem('pwa_ios_dismiss')) setShow(true);
      } catch {
        setShow(true);
      }
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem('pwa_ios_dismiss', '1');
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md rounded-2xl border border-orange-200 bg-white p-4 shadow-xl dark:border-orange-900 dark:bg-slate-900 md:bottom-6 md:left-auto md:right-20">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📲</span>
        <div className="flex-1 text-sm">
          <div className="font-bold">Cài đặt ứng dụng</div>
          {ios ? (
            <p className="mt-1 text-slate-500">
              Safari → Chia sẻ → <b>Thêm vào MH chính</b> để mở nhanh như app.
            </p>
          ) : (
            <p className="mt-1 text-slate-500">
              Thêm HoanTienVN ra màn hình chính để truy cập nhanh.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {!ios && deferred && (
              <button type="button" className="btn-primary !py-2 !px-3 text-xs" onClick={install}>
                Cài ngay
              </button>
            )}
            <button type="button" className="btn-secondary !py-2 !px-3 text-xs" onClick={dismiss}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
