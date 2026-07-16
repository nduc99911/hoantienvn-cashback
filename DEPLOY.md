# Deploy HoanTienVN

> **Lưu ý quan trọng:** Backend (Express + Telegram polling) **không chạy tốt trên Vercel serverless**.  
> Cách đúng: **Frontend → Vercel** · **Backend → Render Free** (khuyến nghị) / Railway / VPS.  
> Chi tiết Render + chống sleep: **[RENDER.md](./RENDER.md)**

## 1. GitHub

```bash
cd shopee-cashback
git init
git add .
git commit -m "Initial HoanTienVN cashback platform"
# Tạo repo trống trên github.com rồi:
git remote add origin https://github.com/YOUR_USER/hoantienvn-cashback.git
git branch -M main
git push -u origin main
```

## 2. Backend (Railway hoặc Render)

### Biến môi trường bắt buộc

| Key | Ví dụ |
|-----|--------|
| `JWT_SECRET` | chuỗi ngẫu nhiên dài |
| `SHOPEE_AFFILIATE_ID` | `17320010599` |
| `TELEGRAM_BOT_TOKEN` | token BotFather |
| `TELEGRAM_MODE` | `polling` (dễ) hoặc `webhook` |
| `PUBLIC_URL` | `https://your-api.onrender.com` |
| `CASHBACK_SHARE_RATIO` | `0.70` |
| `REDIRECT_MODE` | `shopee_an_redir` |

### Render

1. New → Web Service → connect repo  
2. Root directory: `backend`  
3. Build: `npm install`  
4. Start: `npm start`  
5. Seed lần đầu: Shell → `npm run seed`

### Railway

1. New project → Deploy from GitHub  
2. Root: `backend`  
3. Add volume mount `./data` nếu cần giữ SQLite  

API health: `https://YOUR-API/api/health`

## 3. Frontend (Vercel)

1. [vercel.com](https://vercel.com) → Import GitHub repo  
2. **Root Directory:** `frontend`  
3. Framework: Vite  
4. Environment variable:

```
VITE_API_URL=https://YOUR-API.onrender.com
```

5. Deploy  

Site: `https://xxx.vercel.app`

## 4. Sau deploy

1. Admin login `admin@hoantien.vn` / đổi mật khẩu ngay  
2. Cấu hình `site_url` = URL Vercel (short link)  
3. Telegram: chat [@hoantienvn_shopee_bot](https://t.me/hoantienvn_shopee_bot) → `/menu`  
4. Test dán link Shopee  

## 5. Vì sao không full Vercel?

| Thành phần | Vercel |
|------------|--------|
| React SPA | ✅ |
| Express + better-sqlite3 | ❌ (ephemeral FS, no native long-run) |
| Telegram long polling | ❌ |
| Import CSV + cron hold | ⚠️ cần process chạy 24/7 |

## Bảo mật

- Không commit file `.env`  
- Token Telegram lộ chat → revoke trên BotFather nếu cần  
- Đổi `JWT_SECRET` + mật khẩu admin trên production  
