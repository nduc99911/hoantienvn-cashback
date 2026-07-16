# Zalo session refresh tool

Khi bot personal die (session/cookie chết), chạy local:

```bash
cd backend
npm run zca:refresh
```

## Flow

1. Hiện QR (`data/zca-qr.png`, tự mở ảnh)
2. Quét bằng **acc bot phụ**
3. Lưu `data/zca-session.json`
4. Encode base64 → clipboard + `data/zca-session.b64.txt`
5. Local `.env` set `ZCA_ENABLED=0` (không cướp listener production)
6. Nếu có `RENDER_API_KEY`: merge env Render (`ZCA_SESSION_B64`, `ZCA_ENABLED=1`) + deploy
7. Poll `…/api/zalo/personal/status` đến `online: true`

## Flags

| Lệnh | Ý nghĩa |
|------|---------|
| `npm run zca:refresh` | Full flow |
| `npm run zca:refresh:local` | Chỉ QR + B64 (paste tay Render) |
| `npm run zca:refresh:reuse` | Không QR, dùng session file + push |
| `--no-deploy` | Cập nhật env, không trigger deploy |
| `--no-poll` | Không chờ online |
| `--no-open-qr` | Không auto mở file QR |

## Render auto-push

Trong `backend/.env` (không commit):

```env
RENDER_API_KEY=rnd_xxx
RENDER_SERVICE_ID=srv_xxx
# hoặc RENDER_SERVICE_NAME=hoantienvn-api
RENDER_API_URL=https://hoantienvn-api.onrender.com
ZCA_ALLOW_GROUP=1
```

API key: Dashboard Render → Account Settings → API Keys.

## Lưu ý

- Unofficial zca-js — ban risk, acc phụ
- 1 listener / 1 acc — đừng mở Zalo Web + bot cùng lúc
- Không commit `data/zca-session*`
