import { getSetting } from '../db/schema.js';

/**
 * VietQR image URL (không cần API key) — dùng img.vietqr.io
 * https://img.vietqr.io/image/{BIN}-{ACCOUNT}-compact2.png?amount=&addInfo=&accountName=
 */
export function buildVietQrUrl({ amount, addInfo, account, bin, holder }) {
  const bankBin = bin || getSetting('admin_bank_bin', '970422');
  const acc = account || getSetting('admin_bank_account', '');
  const name = holder || getSetting('admin_bank_holder', '');
  if (!acc) return null;

  const params = new URLSearchParams();
  if (amount) params.set('amount', String(Math.round(amount)));
  if (addInfo) params.set('addInfo', addInfo.slice(0, 25));
  if (name) params.set('accountName', name);

  return `https://img.vietqr.io/image/${bankBin}-${acc}-compact2.png?${params.toString()}`;
}

/** QR hiển thị khi admin chuẩn bị chuyển cho user (thông tin STK user) */
export function buildUserPayoutQr(withdraw) {
  // Rút bank: QR theo STK user nhận tiền (admin quét chuyển)
  // Cần BIN — nếu user chỉ có bank name, map sơ bộ
  const binMap = {
    VCB: '970436',
    VIETCOMBANK: '970436',
    MB: '970422',
    MBBANK: '970422',
    TCB: '970407',
    TECHCOMBANK: '970407',
    ACB: '970416',
    VPB: '970432',
    VPBAANK: '970432',
    TPB: '970423',
    BIDV: '970418',
    VTB: '970415',
    VIETINBANK: '970415',
    AGR: '970405',
  };
  const raw = (withdraw.bank_name || '').toUpperCase().replace(/\s+/g, '');
  let bin = null;
  for (const [k, v] of Object.entries(binMap)) {
    if (raw.includes(k)) {
      bin = v;
      break;
    }
  }
  if (!bin || !withdraw.bank_account) {
    // fallback admin QR for reference
    return buildVietQrUrl({
      amount: withdraw.amount,
      addInfo: `RUT${withdraw.id}`,
    });
  }
  return buildVietQrUrl({
    amount: withdraw.amount,
    addInfo: `HTVN${withdraw.id}`,
    account: withdraw.bank_account,
    bin,
    holder: withdraw.bank_holder,
  });
}
