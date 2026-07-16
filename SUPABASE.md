# Kết nối Supabase (Postgres free)

## 1. Tạo project free

1. Vào https://supabase.com → **New project**
2. Chọn region gần (Singapore)
3. Đặt password DB → **Create**

## 2. Lấy connection string

**Project Settings → Database → Connection string → URI**

Dạng:

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Hoặc **Session mode** port `5432`:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

> Nên dùng **Transaction pooler (6543)** trên serverless; Render/Railway dùng **5432** hoặc pooler đều được.

## 3. Tạo bảng

**SQL Editor → New query** → dán toàn bộ file:

`backend/src/db/schema.sql` → **Run**

## 4. Cấu hình backend

`backend/.env`:

```env
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres
JWT_SECRET=doi-bang-chuoi-dai-ngau-nhien
SHOPEE_AFFILIATE_ID=17320010599
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MODE=polling
REDIRECT_MODE=shopee_an_redir
CASHBACK_SHARE_RATIO=0.70
```

## 5. Seed admin

```bash
cd backend
npm run seed
```

Tài khoản:

- Admin: `admin@hoantien.vn` / `admin123`
- Demo: `demo@hoantien.vn` / `demo123`

## 6. Chạy

```bash
npm run dev
```

Log phải có: `[db] engine=supabase/postgres`

## 7. Deploy (Render + Vercel)

**Render** env thêm `DATABASE_URL` (Supabase).

**Vercel** frontend:

```
VITE_API_URL=https://your-api.onrender.com
```

## Local không Supabase

Bỏ / để trống `DATABASE_URL` → tự dùng SQLite `backend/data/cashback.db`.

## Lưu ý free

- Free tier có giới hạn storage / connection
- Không commit `.env`
- Đổi mật khẩu admin sau khi lên production
