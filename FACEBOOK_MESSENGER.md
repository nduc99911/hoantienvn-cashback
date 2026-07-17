# Hướng dẫn tạo App Meta + bot Messenger (HoanTienVN)

Bot chat **Messenger với Fanpage** (API chính thức). Không phải bot trong Group.

## Chuẩn bị

- Tài khoản Facebook (nên dùng acc chính / Business)
- Đã có **Facebook Page** (Fanpage) — nếu chưa: facebook.com → Trang → Tạo trang
- API production đang chạy: `https://api.hoantien.pro.vn`

## Thông số dán vào Meta (copy sẵn)

| Mục | Giá trị |
|-----|---------|
| **Callback URL** | `https://api.hoantien.pro.vn/api/facebook/webhook` |
| **Verify Token** | `hoantienvn_fb` |
| **Subscribe fields** | `messages`, `messaging_postbacks` |

> Verify Token trên Meta **phải trùng** Admin/Render: `facebook_verify_token` / `FACEBOOK_VERIFY_TOKEN`.

---

## Bước 1 — Tạo Facebook Page (nếu chưa có)

1. Vào [facebook.com/pages/create](https://www.facebook.com/pages/create)  
2. Chọn loại (Doanh nghiệp / Thương hiệu)  
3. Đặt tên (vd. **HoanTienVN**) → tạo xong  
4. Ghi nhớ tên Page / username (sau dùng `m.me/...`)

---

## Bước 2 — Vào Meta for Developers

1. Mở [developers.facebook.com](https://developers.facebook.com/)  
2. Đăng nhập Facebook  
3. Góc trên: **My Apps** → **Create App**

### Chọn loại App

Giao diện Meta hay đổi, chọn một trong các hướng:

- **Business** / **Other** / **Create an app** không gắn use-case lạ  
- Nếu hỏi use case: chọn gần **Business** / **Manage everything on your Page** / Messenger  

Tên app: `HoanTienVN Messenger` (tùy bạn)  
Contact email: email của bạn  

→ **Create app**

---

## Bước 3 — Thêm Messenger

1. Trong dashboard App → **Add Products** / **Use cases**  
2. Tìm **Messenger** → **Set up** / **Add**  
3. Vào **Messenger** → **Messenger API settings** (hoặc Settings)

---

## Bước 4 — Gắn Page + lấy Page Access Token

1. Mục **Access Tokens** / **Token generation**  
2. **Select a Page** → chọn Page **HoanTienVN** (vừa tạo)  
3. Có thể hiện quyền — cho phép App quản lý Page / messaging  
4. Copy **Page Access Token** (chuỗi dài)  

⚠️ Token này **bí mật** — chỉ dán Admin/Render, không commit git, không gửi chat công khai.

### Token hết hạn?

Page token từ dashboard đôi khi dài hạn; nếu hết hạn, generate lại.  
Production nên dùng token **không hết hạn** (long-lived) theo docs Meta khi scale.

---

## Bước 5 — Cấu hình Webhook (quan trọng)

1. Trong Messenger settings → **Webhooks** → **Add Callback URL** / **Configure**  
2. Điền:

```
Callback URL:
https://api.hoantien.pro.vn/api/facebook/webhook

Verify token:
hoantienvn_fb
```

3. Bấm **Verify and save**  

- **Thành công** = Meta gọi GET webhook, server trả `hub.challenge`  
- **Fail** = Render sleep / sai verify token / API chưa deploy  

**Nếu fail:**  
- Mở `https://api.hoantien.pro.vn/api/ping` (đánh thức Render)  
- Admin đã set `facebook_verify_token = hoantienvn_fb`  
- Chờ 1–2 phút → Verify lại  

4. **Subscribe to events** (Page fields):

- ✅ `messages`  
- ✅ `messaging_postbacks`  
(tuỳ chọn: `messaging_optins`)

5. **Subscribe Page** / gắn webhook cho đúng Page vừa chọn  

---

## Bước 6 — Gắn token vào HoanTienVN

### Cách A — Admin web

1. https://hoantienvn.vercel.app/admin → **Cấu hình**  
2. Điền:

| Key | Value |
|-----|--------|
| `facebook_bot_enabled` | `1` |
| `facebook_page_token` | *(Page Access Token vừa copy)* |
| `facebook_verify_token` | `hoantienvn_fb` |
| `support_facebook` | `https://m.me/TenPage` hoặc link Fanpage |

3. **Lưu**

### Cách B — Render Environment

```
FACEBOOK_BOT_ENABLED=1
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxx...
FACEBOOK_VERIFY_TOKEN=hoantienvn_fb
```

Save → redeploy nếu cần.

---

## Bước 7 — Test bot

### Chế độ Development (mặc định)

Chỉ acc **Admin / Developer / Tester** của App nhắn Page mới được bot xử lý.

1. App Dashboard → **Roles** → **Roles** / **Test users**  
2. Thêm Facebook của bạn làm **Administrator** hoặc **Tester**  
3. Mở Messenger → tìm **Page** → nhắn:  
   - `menu`  
   - dán 1 link Shopee  

Bot trả menu / link hoàn tiền = **OK**.

### Mở cho mọi người (sau này)

Cần **App Review** quyền `pages_messaging` — khi đã test ổn và muốn public.

---

## Bước 8 — Liên kết ví web

1. User login https://hoantienvn.vercel.app  
2. Dashboard → **Tạo mã liên kết Facebook**  
3. Trên Messenger gửi: `lienket 123456`  
4. Thấy ✅ → cùng ví với web  

---

## Checklist lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Webhook Verify failed | Ping API, đúng verify token, Render live |
| Nhắn Page không reply | App còn Dev mode + acc chưa là Tester; chưa bật `facebook_bot_enabled`; sai Page token |
| Token invalid | Generate lại Page Access Token, paste lại |
| Chỉ mình chat được | Bình thường khi Dev — cần App Review để public |

---

## Lệnh bot (đã code)

| Gửi | Ý nghĩa |
|-----|---------|
| `menu` | Hướng dẫn |
| Link Shopee | Link hoàn tiền |
| `sodu` | Số dư |
| `don` | Đơn gần đây |
| `subid` | Mã tracking |
| `lienket 123456` | Gắn TK web |
| `dangky` | Tạo TK nhanh |

---

## Link hữu ích

- [developers.facebook.com](https://developers.facebook.com/)  
- [Messenger Quick Start](https://developers.facebook.com/documentation/business-messaging/messenger-platform/getting-started/quick-start)  
- Status API: `https://api.hoantien.pro.vn/api/facebook/status`  

---

## Chính sách

Dùng Page + API chính thức = **được phép**.  
Không spam, không bot Group lậu, không giả mạo.
