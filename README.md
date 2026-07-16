# HoanTienVN — Cashback Shopee (không Open API)

Hệ thống hoàn tiền full-stack: **an_redir** + claim + **hold 7 ngày** + fraud + Telegram + VietQR + import CSV + blog + multi-sàn + PWA.

## Chạy

```bash
# API
cd backend && npm install && npm run seed && npm run dev
# http://localhost:4000

# Web
cd frontend && npm install && npm run dev
# http://localhost:5173
```

| | Email | Pass |
|--|--------|------|
| User | demo@hoantien.vn | demo123 |
| Admin | admin@hoantien.vn | admin123 |

## Tính năng

| Module | Chi tiết |
|--------|----------|
| **an_redir** | `s.shopee.vn/an_redir?origin_link&affiliate_id&sub_id` |
| **Short link** | `/r/xxx` log click → redirect |
| **Claim đơn** | User khai báo mã đơn + fraud score |
| **Hold** | Duyệt → hold N ngày → cron nhả ví + F1/F2 |
| **Fraud** | Trùng đơn, no-click, rate claim/ngày, reject gần đây |
| **Rate limit** | Auth / claim / convert |
| **Telegram** | Notify claim + rút (bot token + chat id) |
| **VietQR** | QR STK user khi admin xử lý rút bank |
| **Import CSV** | Export portal Affiliate → match sub_id |
| **KPI Admin** | GMV, hold, paid, 7 ngày, ban user |
| **Blog + SEO** | Bài viết, sitemap `/api/public/sitemap.xml` |
| **Multi-sàn** | Shopee (an_redir) + TikTok/Lazada (redirect SP) |
| **PWA** | manifest + service worker |
| **Dark mode** | Toggle 🌙 |
| **Thông báo in-app** | Chuông + list |
| **F1/F2** | 5% / 2% khi tiền vào ví |

## Config quan trọng (`.env` / Admin)

```env
SHOPEE_AFFILIATE_ID=17320010599
REDIRECT_MODE=shopee_an_redir
HOLD_DAYS=7
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ADMIN_BANK_BIN=970422
ADMIN_BANK_ACCOUNT=
```

## Luồng tiền

```
Claim → pending_review
     → Admin duyệt → held (hold_until +7d)
     → Cron 15' / mở ví → paid (balance) + F1/F2
     → User rút bank/MoMo
```

## Bot Telegram (khuyến nghị — không cần Zalo OA)

### Setup 2 phút

1. Mở [@BotFather](https://t.me/BotFather) → `/newbot` → đặt tên  
2. Copy token → `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_BOT_ENABLED=1
TELEGRAM_MODE=polling
# optional: chat id admin nhận notify
TELEGRAM_CHAT_ID=
```

3. Restart API (`npm run dev`). Local dùng **polling** — không cần HTTPS.  
4. Chat bot → `/start` → dán link Shopee.

### Lệnh

| Lệnh | Chức năng |
|------|-----------|
| *dán link Shopee* | an_redir + short + giá/hoàn |
| `/sodu` | Số dư / hold |
| `/subid` | Mã tracking Aff |
| `/don` | 5 đơn gần đây |
| `/lienket 123456` | Gắn TK web (mã ở Dashboard) |
| `/menu` | Menu |

Thông báo hold/cộng ví đẩy về Telegram nếu user đã liên kết.

## Production / Deploy

Chi tiết: [DEPLOY.md](./DEPLOY.md)

| Phần | Nơi deploy |
|------|------------|
| Frontend (Vite) | **Vercel** |
| Backend (Express + SQLite + Telegram) | **Render / Railway / VPS** (không full Vercel) |

```bash
# Local production build
cd frontend && npm run build
cd ../backend && npm start
```

Env production: copy `backend/.env.example` → set `JWT_SECRET`, `SHOPEE_AFFILIATE_ID`, `TELEGRAM_BOT_TOKEN`, `PUBLIC_URL`.
