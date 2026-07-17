# Deploy domain `hoantien.pro.vn`

Cấu trúc khuyến nghị:

| Host | Trỏ tới | Vai trò |
|------|---------|---------|
| `hoantien.pro.vn` | Vercel (project **hoantienvn**) | Website |
| `www.hoantien.pro.vn` | Vercel (redirect → apex) | www |
| `api.hoantien.pro.vn` | Render (**hoantienvn-api**) | Backend API |

---

## 1) Vercel — gắn domain web

1. Mở [vercel.com](https://vercel.com) → project **hoantienvn**  
2. **Settings** → **Domains** → **Add**  
3. Thêm lần lượt:
   - `hoantien.pro.vn`
   - `www.hoantien.pro.vn`  
4. Vercel hiện bản ghi DNS cần thêm (thường):

### Apex `hoantien.pro.vn`

**Cách A (khuyên — nếu nhà domain hỗ trợ CNAME flatten / ALIAS):**

| Type | Name | Value |
|------|------|--------|
| CNAME / ALIAS / ANAME | `@` | `cname.vercel-dns.com` |

**Cách B (A record — phổ biến .vn):**

| Type | Name | Value |
|------|------|--------|
| A | `@` | `76.76.21.21` |

*(IP Vercel có thể hiện khác trên dashboard — **ưu tiên copy đúng từ Vercel**)*

### www

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `cname.vercel-dns.com` |

5. Chờ DNS xanh (vài phút–vài giờ), SSL tự bật.

### Biến môi trường Vercel (build)

**Settings → Environment Variables → Production:**

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://api.hoantien.pro.vn` |

*(Nếu chưa gắn API custom domain, tạm dùng `https://hoantienvn-api.onrender.com` rồi đổi sau)*

Sau khi sửa env → **Deployments → … → Redeploy** (bắt buộc, vì Vite bake URL lúc build).

---

## 2) Render — gắn domain API

1. [dashboard.render.com](https://dashboard.render.com) → service **hoantienvn-api**  
2. **Settings** → **Custom Domains** → **Add**  
3. Nhập: `api.hoantien.pro.vn`  
4. Render hiện CNAME, ví dụ:

| Type | Name | Value |
|------|------|--------|
| CNAME | `api` | `hoantienvn-api.onrender.com` |

*(Copy **chính xác** target Render đưa — có thể là `xxx.onrender.com`)*

5. SSL: Render cấp sau khi DNS OK.

### Biến môi trường Render

**Environment → Add/Edit:**

| Key | Value |
|-----|--------|
| `SITE_URL` | `https://hoantien.pro.vn` |
| `PUBLIC_URL` | `https://api.hoantien.pro.vn` |
| `PUBLIC_API_URL` | `https://api.hoantien.pro.vn` (nếu có dùng) |

Giữ nguyên: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`, `JWT_SECRET`, Google OAuth, v.v.

**Save** → service restart/redeploy.

---

## 3) DNS tại nhà bán domain (PA / Matbao / …)

Vào **Quản lý DNS** của `hoantien.pro.vn`, thêm:

| Type | Host/Name | Value | TTL |
|------|-----------|--------|-----|
| A hoặc CNAME | `@` | theo Vercel | 300–3600 |
| CNAME | `www` | `cname.vercel-dns.com` | … |
| CNAME | `api` | theo Render | … |

**Lưu ý .vn:**

- Đôi khi host `@` ghi là trống hoặc `hoantien.pro.vn`  
- Host `www` = `www`  
- Host `api` = `api`  
- Xóa bản ghi cũ xung đột (A/CNAME trùng tên)

Kiểm tra (sau 5–30 phút):

```text
https://hoantien.pro.vn
https://api.hoantien.pro.vn/api/ping
https://api.hoantien.pro.vn/api/health
```

---

## 4) Admin web — settings

Login admin → **Cấu hình** → Lưu:

| Key | Value |
|-----|--------|
| `site_url` | `https://hoantien.pro.vn` |
| `public_url` | `https://api.hoantien.pro.vn` |
| `support_email` | `hotro@hoantien.pro.vn` (nếu đã có mail) |
| `guide_video_url` | (tuỳ, video full URL https) |

Bot Tele/Zalo sẽ hiện web `https://hoantien.pro.vn` (qua `getSiteUrl()`).  
Short link: `https://api.hoantien.pro.vn/r/xxxxx`.

---

## 5) Google OAuth (nếu đang bật login Google)

[Google Cloud Console](https://console.cloud.google.com/) → APIs → Credentials → OAuth Client:

**Authorized JavaScript origins:**

- `https://hoantien.pro.vn`
- `https://www.hoantien.pro.vn`

**Authorized redirect URIs:**

- `https://api.hoantien.pro.vn/api/auth/google/callback`

Render env:

| Key | Value |
|-----|--------|
| `GOOGLE_REDIRECT_URI` | `https://api.hoantien.pro.vn/api/auth/google/callback` |
| `SITE_URL` | `https://hoantien.pro.vn` |

---

## 6) Email (Resend) — khuyến nghị

1. Resend → **Domains** → Add `hoantien.pro.vn`  
2. Thêm bản ghi DNS Resend đưa (TXT/CNAME SPF DKIM)  
3. Verify xong:

```
EMAIL_FROM=HoanTienVN <noreply@hoantien.pro.vn>
RESEND_API_KEY=re_...
```

4. Test quên mật khẩu với email thật.

**Email chuyển tiếp (nếu đã mua):**  
`hotro@hoantien.pro.vn` → Gmail cá nhân.

---

## 7) Telegram / Zalo

Không cần đổi bot token. Sau khi `site_url` đúng:

- Gõ `menu` trên bot → hiện `https://hoantien.pro.vn`  
- Short link không còn localhost  

Nếu Zalo personal offline → Admin **Bật bot** hoặc `npm run zca:refresh`.

---

## 8) Checklist nghiệm thu

- [ ] `https://hoantien.pro.vn` mở được, SSL ổ khóa  
- [ ] `https://www.hoantien.pro.vn` redirect về apex  
- [ ] `https://api.hoantien.pro.vn/api/health` → `ok: true`  
- [ ] Web login / convert link gọi API đúng (F12 → Network không lỗi CORS / sai host)  
- [ ] Admin lưu `site_url` + `public_url`  
- [ ] Vercel đã **Redeploy** sau khi set `VITE_API_URL`  
- [ ] Bot `menu` hiện domain mới  
- [ ] Google login (nếu dùng) không lỗi redirect  
- [ ] (Tuỳ) Resend domain verified  

---

## 9) Giữ song song domain cũ?

- `hoantienvn.vercel.app` vẫn chạy được  
- Sau ổn định: có thể redirect vercel → `hoantien.pro.vn` (Vercel domain redirect)  
- API `*.onrender.com` vẫn dùng được; nên dần chuyển client sang `api.hoantien.pro.vn`

---

## Thứ tự làm nhanh (copy)

1. DNS: A/CNAME `@` + `www` (Vercel) + `api` (Render)  
2. Vercel Add domain + `VITE_API_URL` + **Redeploy**  
3. Render Custom domain + `SITE_URL` + `PUBLIC_URL`  
4. Admin `site_url` / `public_url`  
5. Google OAuth + Resend (nếu cần)  
6. Test checklist  

Gặp lỗi DNS / SSL: chụp màn hình bản ghi DNS + thông báo Vercel/Render để xử lý tiếp.
