import { useEffect, useState } from 'react';

/**
 * Animation các bước nhận hoàn tiền — phong cách UI tui3gang / cashback
 * (icon tròn, đường nối, highlight lần lượt)
 */
const STEPS = [
  {
    id: 1,
    title: 'Dán link',
    desc: 'Copy link SP Shopee',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Copy link hoàn',
    desc: 'Lấy short link của bạn',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Mua hàng',
    desc: 'Thanh toán 20–30 phút',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
  {
    id: 4,
    title: 'Nhận tiền',
    desc: 'Hold → rút bank/MoMo',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

export default function CashbackStepsAnim({ className = '' }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const progressPct = (active / (STEPS.length - 1)) * 100;

  return (
    <div className={`cashback-steps-anim ${className}`}>
      <div className="mb-4 text-center sm:text-left">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
          Các bước nhận hoàn tiền
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Chỉ 4 bước — dán link Shopee, mua, nhận tiền về ví
        </p>
      </div>

      <div className="relative px-1 pt-2 pb-1">
        {/* Track + progress (desktop) */}
        <div
          className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[2.15rem] hidden h-1 rounded-full bg-orange-100 dark:bg-slate-700 sm:block"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-shopee to-brand-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
          {STEPS.map((step, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <li
                key={step.id}
                className="flex flex-col items-center text-center"
                onMouseEnter={() => setActive(i)}
              >
                <div
                  className={[
                    'relative z-10 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border-2 transition-all duration-500',
                    isActive
                      ? 'scale-110 border-shopee bg-gradient-to-br from-shopee to-brand-500 text-white shadow-lg shadow-orange-500/40 step-pulse'
                      : isDone
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border-orange-200 bg-white text-orange-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500',
                  ].join(' ')}
                >
                  {isDone && !isActive ? (
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                  <span
                    className={[
                      'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black',
                      isActive
                        ? 'bg-white text-shopee'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-orange-100 text-orange-500 dark:bg-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {step.id}
                  </span>
                </div>
                <div
                  className={[
                    'mt-2.5 transition-all duration-500',
                    isActive ? 'opacity-100' : 'opacity-70',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'text-sm font-bold leading-tight',
                      isActive
                        ? 'text-shopee'
                        : 'text-slate-800 dark:text-slate-100',
                    ].join(' ')}
                  >
                    {step.title}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {step.desc}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Mobile progress dots */}
        <div className="mt-4 flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={[
                'h-1.5 rounded-full transition-all',
                i === active ? 'w-6 bg-shopee' : 'w-1.5 bg-orange-200 dark:bg-slate-600',
              ].join(' ')}
              aria-label={`Bước ${s.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
