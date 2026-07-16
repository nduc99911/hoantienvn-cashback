/**
 * Đăng nhập Zalo Web bằng QR → lưu session cho bot personal (zca-js).
 *
 * Chạy LOCAL (máy có terminal):
 *   cd backend
 *   node scripts/zca-login-qr.js
 *
 * Quét QR bằng app Zalo (ACC PHỤ khuyến nghị).
 * Sau khi OK → file data/zca-session.json
 *
 * Deploy Render: encode session
 *   node -e "console.log(Buffer.from(require('fs').readFileSync('data/zca-session.json')).toString('base64'))"
 * Set env:
 *   ZCA_ENABLED=1
 *   ZCA_SESSION_B64=<chuỗi base64>
 *
 * ⚠️ Không commit session. Không dùng acc chính.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Zalo, LoginQRCallbackEventType } from 'zca-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath =
  process.env.ZCA_SESSION_PATH ||
  path.join(__dirname, '../data/zca-session.json');

console.log('\n=== HoanTienVN · zca-js QR login ===');
console.log('⚠️  Unofficial API — rủi ro ban. Dùng ACC PHỤ.');
console.log('Session sẽ lưu:', outPath);
console.log('Mở Zalo app → Quét mã QR khi hiện ra...\n');

const zalo = new Zalo({ logging: true });

try {
  const api = await zalo.loginQR({}, (event) => {
    switch (event.type) {
      case LoginQRCallbackEventType.QRCodeGenerated: {
        // event.data có thể chứa qr code image path / base64 tùy version
        const d = event.data || {};
        if (d.image) {
          const qrFile = path.join(path.dirname(outPath), 'zca-qr.png');
          try {
            const buf = Buffer.from(
              String(d.image).replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            );
            fs.mkdirSync(path.dirname(qrFile), { recursive: true });
            fs.writeFileSync(qrFile, buf);
            console.log('[QR] Đã ghi ảnh:', qrFile);
          } catch {
            console.log('[QR] (không ghi được file ảnh — xem terminal/log)');
          }
        }
        if (d.code) console.log('[QR] code:', d.code);
        if (event.actions?.saveToFile) {
          try {
            event.actions.saveToFile(
              path.join(path.dirname(outPath), 'zca-qr.png')
            );
            console.log('[QR] saveToFile → data/zca-qr.png');
          } catch {
            /* optional */
          }
        }
        console.log('[QR] Hãy quét bằng Zalo (ACC PHỤ)...');
        break;
      }
      case LoginQRCallbackEventType.QRCodeScanned:
        console.log('[QR] Đã quét — chờ xác nhận trên điện thoại...');
        break;
      case LoginQRCallbackEventType.QRCodeExpired:
        console.log('[QR] Hết hạn — chạy lại script.');
        break;
      case LoginQRCallbackEventType.QRCodeDeclined:
        console.log('[QR] Từ chối trên điện thoại.');
        break;
      case LoginQRCallbackEventType.GotLoginInfo: {
        const info = event.data;
        if (info?.cookie && info?.imei && info?.userAgent) {
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(
            outPath,
            JSON.stringify(
              {
                cookie: info.cookie,
                imei: info.imei,
                userAgent: info.userAgent,
                language: 'vi',
                savedAt: new Date().toISOString(),
                warning: 'SECRET — do not commit. Secondary account only.',
              },
              null,
              2
            ),
            'utf8'
          );
          console.log('[OK] Session saved:', outPath);
          const b64 = Buffer.from(fs.readFileSync(outPath)).toString('base64');
          console.log(
            '\n--- Render env (dán vào ZCA_SESSION_B64, một dòng) ---'
          );
          console.log(b64.slice(0, 80) + '...(đã cắt, dùng full file base64)');
          console.log(
            '\nFull B64 length:',
            b64.length,
            '— encode lại: node -e "console.log(Buffer.from(require(\'fs\').readFileSync(\'data/zca-session.json\')).toString(\'base64\'))"'
          );
        }
        break;
      }
      default:
        break;
    }
  });

  let uid = '?';
  try {
    if (typeof api.getOwnId === 'function') uid = await api.getOwnId();
  } catch {
    /* ignore */
  }
  console.log('\n✅ Login OK. uid=', uid);
  console.log('Bật bot local: set ZCA_ENABLED=1 rồi npm start');
  console.log('Chỉ 1 listener / acc — đừng mở Zalo Web cùng lúc.\n');
  process.exit(0);
} catch (e) {
  console.error('\n❌ Login fail:', e.message);
  process.exit(1);
}
