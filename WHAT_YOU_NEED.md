# Cần bạn cung cấp / cấu hình (P0–P2)

Code đã có sẵn. Các mục dưới **cần secret hoặc nội dung thật** từ bạn:

## Bắt buộc để “đẹp như đối thủ”

| Mục | Bạn làm gì |
|-----|------------|
| **Domain** `.vn` | Mua domain → trỏ Vercel (FE) + Render (API `api.domain`) → gửi mình hostname nếu cần gắn |
| **Hotline** | SĐT thật → Admin → Cấu hình → `support_phone` |
| **Zalo** | Link nhóm/OA hoặc SĐT → `support_zalo` (vd `https://zalo.me/g/...`) |
| **Facebook / Messenger** | URL fanpage + `https://m.me/xxx` → `support_facebook` / `support_messenger` |
| **Video hướng dẫn** | Link YouTube → `guide_video_url` |
| **Logo** | File PNG/SVG (tuỳ chọn) — gửi để gắn favicon/header |

## Google đăng nhập (P1)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth Client (Web)
2. Authorized redirect URI:
   ```
   https://api.hoantien.pro.vn/api/auth/google/callback
   ```
   (hoặc `https://api.domain.com/api/auth/google/callback`)
3. Gửi / set trên Render:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://api.hoantien.pro.vn/api/auth/google/callback
   SITE_URL=https://hoantienvn.vercel.app
   ```

## F1/F2 (P2)

Mặc định code/settings: **F1 20% · F2 10%** (giống đối thủ).  
Có thể đổi Admin → Cấu hình: `f1_rate=0.20`, `f2_rate=0.10`.

## TikTok Shop (P1)

- Link TikTok đã parse + short redirect được.
- Hoa hồng TikTok **phụ thuộc** bạn có tài khoản TikTok Affiliate / policy riêng — không cần Open API Shopee.
- Bật `enable_tiktok=1` (mặc định).

## Đã xong trong code (không cần chờ)

- Modal 5 lưu ý, FAQ, social stats, voucher + admin
- Floating support, bottom nav mobile, PWA install banner
- Estimator hoàn tiền, referral UI %, blog category
- Google OAuth route (chờ key)

## Email Resend

Đã gắn API key trên Render trước đó.  
Chỉ gửi được tới email verify Resend cho đến khi add domain.
