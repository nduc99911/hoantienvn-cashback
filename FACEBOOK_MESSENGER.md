# Facebook Messenger bot (Page) — HoanTienVN

Bot chat **Messenger với Fanpage** (API chính thức Meta).  
Không phải bot trong Group Facebook.

## Webhook (đã code)

| | |
|--|--|
| Callback URL | `https://hoantienvn-api.onrender.com/api/facebook/webhook` |
| Verify Token | Giống `facebook_verify_token` (mặc định `hoantienvn_fb`) |
| Events | `messages`, `messaging_postbacks` |

## Bước setup Meta (~15–30 phút)

1. Tạo **Facebook Page** (Fanpage shop/HoanTienVN).
2. Vào [developers.facebook.com](https://developers.facebook.com) → **Create App** → loại Business / Other.
3. Thêm product **Messenger**.
4. **Messenger → Settings**:
   - Connect Page
   - Generate **Page Access Token** → copy
5. **Webhooks**:
   - Callback URL: `https://hoantienvn-api.onrender.com/api/facebook/webhook`
   - Verify token: `hoantienvn_fb` (hoặc token bạn đặt)
   - Subscribe: `messages`, `messaging_postbacks`
6. Render / Admin settings:
   ```
   facebook_bot_enabled = 1
   facebook_page_token = <Page Access Token>
   facebook_verify_token = hoantienvn_fb
   support_facebook = https://m.me/YourPageUsername
   ```
   Hoặc env Render:
   ```
   FACEBOOK_BOT_ENABLED=1
   FACEBOOK_PAGE_ACCESS_TOKEN=...
   FACEBOOK_VERIFY_TOKEN=hoantienvn_fb
   ```
7. Test: nhắn Page từ acc admin/tester → gõ `menu` / dán link Shopee.

## Lệnh bot

- `menu` — hướng dẫn  
- Dán link Shopee — link hoàn tiền  
- `sodu` / `don` / `subid`  
- `lienket 123456` — gắn TK web  
- `dangky` — tạo TK ẩn (login web nên lienket)

## App Review

- Dev mode: chỉ admin/tester App chat được.  
- Public user: cần App Review quyền `pages_messaging` (khi scale).

## Liên kết web

Dashboard sẽ có “Tạo mã Facebook” (API: `POST /api/facebook/bind-code`).  
User gửi `lienket xxxxxx` trên Messenger.

## Lưu ý chính sách

- Dùng API chính thức = **được phép**.  
- Không spam, không bot Group lậu.  
- Ngoài 24h window: hạn chế tin chủ động (marketing).
