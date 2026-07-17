# Thiết lập đăng nhập Google (HoanTienVN)

Code đã có sẵn:

- `GET /api/auth/google/start` → redirect Google
- `GET /api/auth/google/callback` → tạo/login user → về FE `/auth/callback?token=...`
- Nút **Tiếp tục với Google** trên trang Login (hiện khi đã cấu hình)

---

## Bước 1 — Google Cloud Console

1. Mở https://console.cloud.google.com/
2. Tạo project (hoặc chọn project có sẵn), ví dụ `HoanTienVN`
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `HoanTienVN`
   - User support email: email của bạn
   - Developer contact: email của bạn
   - Scopes: thêm `email`, `profile`, `openid` (mặc định đủ)
   - Test users (khi app ở chế độ Testing): thêm Gmail sẽ dùng đăng nhập
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `HoanTienVN Web`
   - **Authorized JavaScript origins:**
     ```
     https://hoantienvn.vercel.app
     http://localhost:5173
     ```
   - **Authorized redirect URIs:** (quan trọng)
     ```
     https://api.hoantien.pro.vn/api/auth/google/callback
     http://localhost:4000/api/auth/google/callback
     ```
5. **Create** → copy:
   - **Client ID**
   - **Client Secret**

---

## Bước 2 — Gắn env trên Render

Dashboard Render → service `hoantienvn-api` → **Environment** → Add:

| Key | Value |
|-----|--------|
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | `https://api.hoantien.pro.vn/api/auth/google/callback` |
| `SITE_URL` | `https://hoantienvn.vercel.app` |
| `PUBLIC_URL` | `https://api.hoantien.pro.vn` |

**Save** → **Manual Deploy** (hoặc đợi auto redeploy).

---

## Bước 3 — Kiểm tra

1. Mở https://hoantienvn.vercel.app/login  
2. Thấy nút **Tiếp tục với Google** (không còn dòng “chưa cấu hình”)  
3. Đăng nhập bằng Gmail (nếu app Testing: Gmail phải nằm trong Test users)  
4. Về `/dashboard` với session JWT  

API check:

```
GET https://api.hoantien.pro.vn/api/auth/google/status
→ { "enabled": true, ... }
```

---

## Local dev (tuỳ chọn)

`backend/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
SITE_URL=http://localhost:5173
PUBLIC_URL=http://localhost:4000
```

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| `redirect_uri_mismatch` | URI trên Google Console **khớp exact** với `GOOGLE_REDIRECT_URI` |
| Nút Google không hiện | Thiếu `GOOGLE_CLIENT_SECRET` trên Render, hoặc API chưa redeploy |
| `access_denied` / app chưa verified | Thêm email vào **Test users** (OAuth consent → Testing) |
| Production cho mọi user | Publish app trên OAuth consent (cần verify nếu sensitive scopes — email/profile thường OK) |

---

## Gửi cho mình để gắn giúp

Chỉ cần paste (chat private):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Mình sẽ set Render env + redeploy + test.
