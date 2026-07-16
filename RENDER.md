# Render Free + chống sleep

## Ý tưởng

Render Free **sleep ~15 phút không có request**.  
Cứ **ping `/api/ping` mỗi 10 phút** → instance không sleep → Telegram polling + cron hold vẫn sống.

```
GitHub Actions (*/10 * * * *)
        │
        ▼  GET /api/ping
   Render free API  ──►  Supabase
        ▲
        │  (tuỳ chọn) POST /api/cron/tick + x-cron-secret
        └── release hold orders
```

## 1. Deploy API trên Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**  
   hoặc **Web Service** → repo `nduc99911/hoantienvn-cashback`
2. Root directory: `backend`
3. Build: `npm install` · Start: `npm start` · Plan: **Free**
4. Region: **Singapore** (gần VN)
5. Environment:

| Key | Giá trị |
|-----|---------|
| `DATABASE_URL` | Supabase **pooler IPv4** (bắt buộc) |
| `JWT_SECRET` | chuỗi dài ngẫu nhiên |
| `CRON_SECRET` | chuỗi bí mật (copy sang GitHub Secret) |
| `SHOPEE_AFFILIATE_ID` | `17320010599` |
| `TELEGRAM_BOT_TOKEN` | token BotFather |
| `TELEGRAM_MODE` | `polling` |
| `TELEGRAM_BOT_ENABLED` | `1` |
| `SITE_URL` | `https://hoantienvn.vercel.app` |
| `REDIRECT_MODE` | `shopee_an_redir` |
| `CASHBACK_SHARE_RATIO` | `0.70` |

**DATABASE_URL** (pooler, tránh IPv6):

```
postgresql://postgres.rfmqdkxplmjwxprfcdqr:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

6. Deploy → URL dạng: `https://hoantienvn-api.onrender.com`

Kiểm tra:

```
https://YOUR-API.onrender.com/api/ping
https://YOUR-API.onrender.com/api/health
```

## 2. Keep-alive (GitHub Actions) — đã có trong repo

File: `.github/workflows/keep-alive.yml`

**GitHub → repo → Settings → Secrets and variables → Actions → New:**

| Secret | Ví dụ |
|--------|--------|
| `RENDER_API_URL` | `https://hoantienvn-api.onrender.com` |
| `CRON_SECRET` | cùng `CRON_SECRET` trên Render |

Workflow chạy:
- Tự động mỗi **10 phút**
- Hoặc **Actions → Keep-alive Render → Run workflow** (test tay)

> Repo **private**: Actions schedule vẫn chạy trong quota free GitHub.  
> Nếu 60 ngày không activity, GitHub có thể pause schedule — push 1 commit là bật lại.

## 3. Backup keep-alive (nếu muốn đôi lớp)

### UptimeRobot (free)
- Monitor type: HTTP(s)
- URL: `https://YOUR-API.onrender.com/api/ping`
- Interval: **5 phút**

### cron-job.org (free)
- URL: `https://YOUR-API.onrender.com/api/cron/tick`
- Header: `x-cron-secret: YOUR_CRON_SECRET`
- Every 10 minutes

## 4. Nối frontend Vercel

```
VITE_API_URL=https://YOUR-API.onrender.com
```

Redeploy Vercel production.

## 5. Seed (nếu DB trống)

Render → Shell:

```bash
npm run seed
```

## Endpoints keep-alive

| Path | Mục đích |
|------|----------|
| `GET /api/ping` | Nhẹ, chỉ wake |
| `GET/POST /api/cron/tick` | Wake + (nếu secret đúng) release hold |
| `GET /api/health` | Full health (nặng hơn một chút) |

## Lưu ý free

- Keep-alive 24/7 ≈ 1 instance luôn bật → đủ trong free hours Render (1 service).
- Lần đầu cold start sau deploy vẫn có thể 30–60s.
- Không commit `DATABASE_URL` / token vào git.
