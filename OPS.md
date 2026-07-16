# Vận hành & giải thích STK/MoMo admin

## STK / MoMo admin dùng để làm gì?

| Trường cấu hình | Mục đích |
|-----------------|----------|
| `admin_bank_bin` + `admin_bank_account` + `admin_bank_holder` | Fallback VietQR khi **không map được BIN** từ tên NH của user. QR chính khi rút bank vẫn ưu tiên **STK user** (admin quét → chuyển **cho user**). |
| `admin_momo_phone` | Số MoMo tham chiếu khi xử lý rút MoMo (đối chiếu / liên hệ), không auto-transfer. |

**Chiều tiền cashback:** Hoa hồng Shopee về TK affiliate master của bạn → bạn chi hoàn cho user qua bank/MoMo.

**Không** dùng STK admin để thu tiền user trong flow rút ví.

---

## Quy trình CSV (mỗi kỳ)

1. affiliate.shopee.vn → Báo cáo hoa hồng → tải `AffiliateCommissionReport_*.csv`
2. Admin → **Import CSV** → Preview → Import & Hold  
3. Kiểm tra đơn / Sub_id1 = `U{id}_{referralCode}`
4. **Rút tiền** → quét VietQR user → Đã chuyển  
5. KPI → Nhả hold đến hạn (cron 15’ + keep-alive)

Chi tiết checklist cũng có trong Admin tab **Ops CSV**.

---

## Email marketing

1. Cấu hình `RESEND_API_KEY` hoặc SMTP trên Render  
2. Admin → **Email MKT** → tạo draft → Gửi  
3. User mặc định `marketing_opt_in=1` (có thể tắt qua API)

## OTP SMS

- API: `POST /api/auth/otp/send` · `POST /api/auth/otp/verify`  
- Mặc định `SMS_PROVIDER=mock` (in log)  
- Production: ESMS hoặc Twilio (xem `.env.example`)

## Multi-admin

| Role | Quyền chính |
|------|-------------|
| super_admin | * |
| admin | hầu hết ops + marketing + settings |
| finance | đơn/hold/rút/import |
| support | xem đơn, reject, ban |

Đổi role: Admin → Users → dropdown role.
