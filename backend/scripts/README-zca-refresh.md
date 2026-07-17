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

**Nếu chưa có API key**, tool **tự mở trình duyệt** + hỏi khi chạy `npm run zca:refresh`:

1. Hỏi có muốn kết nối Render không (Y/n)
2. **Tự mở** https://dashboard.render.com/u/settings#api-keys
3. Bạn Create API Key → copy → dán vào terminal
4. Kiểm tra key → liệt kê services → chọn số
5. Hỏi lưu vào `backend/.env` cho lần sau
6. Push session + deploy + poll online

Hoặc set sẵn trong `backend/.env` (không commit):

```env
RENDER_API_KEY=rnd_xxx
RENDER_SERVICE_ID=srv_xxx
# hoặc RENDER_SERVICE_NAME=hoantienvn-api
RENDER_API_URL=https://api.hoantien.pro.vn
ZCA_ALLOW_GROUP=1
```

## Lưu ý

- Unofficial zca-js — ban risk, acc phụ
- 1 listener / 1 acc — đừng mở Zalo Web + bot cùng lúc
- Không commit `data/zca-session*`
