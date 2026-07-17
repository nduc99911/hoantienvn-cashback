/**
 * Seed nhiều bài blog production
 * Usage: API_BASE=... ADMIN_EMAIL=... ADMIN_PASS=... node scripts/seed-blogs.mjs
 */
const API = (process.env.API_BASE || 'https://api.hoantien.pro.vn').replace(
  /\/$/,
  ''
);
const EMAIL = process.env.ADMIN_EMAIL || 'admin@hoantien.vn';
const PASS = process.env.ADMIN_PASS || 'admin123';

const posts = [
  {
    category: 'Hướng dẫn hoàn tiền',
    title: 'Hoàn tiền Shopee là gì? Cách hoạt động trên HoanTienVN',
    excerpt:
      'Giải thích đơn giản: hoa hồng affiliate, sub_id, hold và rút tiền — dành cho người mới.',
    content: `## Hoàn tiền mua hàng là gì?

Khi bạn mua hàng qua link giới thiệu (affiliate), sàn Shopee trả hoa hồng cho người giới thiệu. HoanTienVN dùng tài khoản Affiliate master, gắn **sub_id** theo từng user, rồi **chia lại một phần hoa hồng** (thường ~70%) thành tiền hoàn vào ví.

## Quy trình 3 bước

1. Dán link sản phẩm Shopee/TikTok trên web → nhận short link.
2. Click short link → mua và thanh toán trong 20–30 phút.
3. Đơn được ghi nhận (import báo cáo Affiliate) → hold vài ngày → vào số dư rút được.

## Lưu ý quan trọng

- Giỏ hàng nên trống sản phẩm đó trước khi click link.
- Không bấm link affiliate/KOL khác giữa chừng.
- Tắt Adblock nếu đơn hay bị “mất tracking”.

## Kết luận

Bạn mua như bình thường, hệ thống lo tracking và đối soát. Rút về bank/MoMo khi đủ mức tối thiểu.`,
  },
  {
    category: 'Hướng dẫn hoàn tiền',
    title: '5 lỗi khiến đơn không được hoàn tiền (và cách tránh)',
    excerpt:
      'Click link khác, giỏ cũ, Adblock, hủy đặt lại… — checklist trước khi thanh toán.',
    content: `## 1. Đã có sẵn sản phẩm trong giỏ

Nên xóa SP đó khỏi giỏ, click link hoàn tiền, rồi mới thêm lại.

## 2. Bấm link chia sẻ / ads khác

Cookie tracking bị ghi đè. Chỉ dùng short link trên HoanTienVN.

## 3. Thanh toán quá chậm

Nên checkout trong 20–30 phút sau khi mở link.

## 4. Adblock / chặn tracking

Tắt extension chặn quảng cáo trên trình duyệt/app nếu có.

## 5. Hủy đơn rồi đặt lại trực tiếp

Phải lấy link mới và click lại từ đầu trên web.

## Mẹo

Chụp lại mã đơn và thời gian đặt — dễ hỗ trợ khi đối soát.`,
  },
  {
    category: 'Hướng dẫn hoàn tiền',
    title: 'Cách lấy link hoàn tiền trên điện thoại (Shopee App)',
    excerpt:
      'Copy link từ app Shopee, dán vào web, mở short link rồi thanh toán đúng quy trình.',
    content: `## Trên app Shopee

1. Mở sản phẩm → Chia sẻ → Sao chép liên kết.
2. Mở trình duyệt → vào HoanTienVN → dán link → Lấy link hoàn tiền.
3. Mở short link (nên mở bằng trình duyệt, không dán lại link cũ).
4. App Shopee mở ra → thêm vào giỏ → thanh toán.

## iOS / Android

- iOS Safari: có thể “Thêm vào MH chính” để mở web như app.
- Android Chrome: banner cài PWA nếu trình duyệt hỗ trợ.

## Sau khi mua

Theo dõi tab Đơn / Ví. Khi admin import CSV Shopee, đơn sẽ vào hold rồi vào số dư.`,
  },
  {
    category: 'Mẹo săn sale',
    title: 'Cách săn mã giảm giá Shopee kết hợp hoàn tiền',
    excerpt:
      'Dùng voucher + link hoàn tiền đúng thứ tự để vừa giảm giá vừa nhận cashback.',
    content: `## Thứ tự đúng

1. Lấy **link hoàn tiền** trước (để gắn tracking).
2. Vào app qua short link.
3. Áp mã giảm giá / freeship trong giỏ (nếu đủ điều kiện).
4. Thanh toán.

## Lưu ý

Một số chương trình voucher đặc biệt có thể ảnh hưởng hoa hồng. Ưu tiên đơn “đủ điều kiện affiliate”.

## Trên HoanTienVN

Trang chủ có mục **Mã khuyến mãi Shopee** — copy mã trước, rồi mua qua link hoàn tiền.`,
  },
  {
    category: 'Mẹo săn sale',
    title: 'Khung giờ săn sale Shopee hiệu quả',
    excerpt:
      'Canh live, flash sale 0h/9h/12h/21h và mẹo giữ giỏ để chốt đơn nhanh.',
    content: `## Khung giờ hay có deal

- 0h–1h: flash sale ngày mới
- 9h / 12h / 21h: đợt mã và freeship phổ biến
- Live commerce: giá + voucher riêng phiên

## Mẹo

- Chuẩn bị link hoàn tiền **trước** giờ G.
- Không spam click link khác khi đang live.
- Kiểm tra shop uy tín, thời gian giao hàng.

## Kết hợp hoàn tiền

Deal càng lớn + hoa hồng ngành hàng cao → tiền hoàn càng đáng. Thời trang, làm đẹp, phụ kiện điện thoại thường có HH tốt (tùy thời điểm).`,
  },
  {
    category: 'Giới thiệu bạn bè',
    title: 'Kiếm hoa hồng F1/F2 khi giới thiệu bạn bè dùng HoanTienVN',
    excerpt:
      'Chia sẻ link mời một lần — nhận % trên tiền hoàn của F1 và F2 mỗi khi họ mua.',
    content: `## F1 và F2 là gì?

- **F1**: người đăng ký bằng link/mã của bạn.
- **F2**: người do F1 mời tiếp.

Bạn nhận hoa hồng trên **số tiền hoàn** hợp lệ của họ (sau khi đơn vào ví), theo tỷ lệ cấu hình (ví dụ F1 20%, F2 10%).

## Cách làm

1. Vào **Mời bạn** / Referrals.
2. Copy link \`/register?ref=MÃ_CỦA_BẠN\`.
3. Gửi Zalo/Facebook/group.
4. Hướng dẫn họ lấy link hoàn tiền **lần đầu**.

## Lưu ý

Không spam, không tạo tài khoản ảo. Hoa hồng chỉ tính đơn hợp lệ được đối soát.`,
  },
  {
    category: 'Giới thiệu bạn bè',
    title: 'Template tin nhắn mời bạn bè dùng hoàn tiền Shopee',
    excerpt: 'Copy-paste tin nhắn Zalo/Messenger ngắn gọn, dễ hiểu cho người mới.',
    content: `## Mẫu 1 — Ngắn

"Anh/chị ơi, web này dán link Shopee là được hoàn tiền về ví, rút bank được. Đăng ký giúp em bằng link này nhé: [LINK]. Lần đầu em hướng dẫn 2 phút."

## Mẫu 2 — Chi tiết

"Mình đang dùng HoanTienVN: copy link sp Shopee → dán web → mua như bình thường → được chia hoa hồng. Link mời của mình: [LINK]. Lưu ý click đúng short link và tắt adblock nhé."

## Mẫu 3 — Nhóm săn sale

"Ai hay săn sale Shopee thì dùng link hoàn tiền trước khi chốt đơn. Group mình share link + mã giảm. Đăng ký: [LINK]."`,
  },
  {
    category: 'Rút tiền & ví',
    title: 'Cách rút tiền hoàn về ngân hàng / MoMo',
    excerpt:
      'Điều kiện số dư, điền STK, thời gian xử lý và checklist trước khi gửi yêu cầu.',
    content: `## Điều kiện

- Số dư khả dụng ≥ mức rút tối thiểu (cấu hình site, thường 50.000đ).
- Đơn đã **hết hold** (không còn trạng thái hold).

## Các bước

1. Cập nhật STK/MoMo trong hồ sơ.
2. Vào **Rút tiền** → chọn bank hoặc MoMo.
3. Nhập số tiền → gửi yêu cầu.
4. Chờ admin duyệt và chuyển.

## Thời gian

Thường 1–3 ngày làm việc (không cam kết cố định). Kiểm tra thông báo / Telegram nếu đã gắn bot.`,
  },
  {
    category: 'TikTok Shop',
    title: 'Hoàn tiền TikTok Shop: dán link và lưu ý tracking',
    excerpt:
      'Cách lấy link sản phẩm TikTok Shop, tạo short link trên web và những điểm khác Shopee.',
    content: `## Cách lấy link

1. Mở sản phẩm trên TikTok Shop / app.
2. Chia sẻ → sao chép liên kết.
3. Dán vào ô lấy link trên HoanTienVN.
4. Mở short link và mua.

## Lưu ý

- Tracking TikTok có thể khác cookie Shopee.
- Vẫn nên mua nhanh sau khi click, tránh bấm link khác.
- Hoa hồng phụ thuộc chương trình Affiliate TikTok của chủ hệ thống.

## Shopee hay TikTok?

Cả hai đều dùng được nếu nền tảng đang bật. Ưu tiên sàn bạn mua nhiều + ngành hàng HH cao.`,
  },
  {
    category: 'Tin tức',
    title: 'Hold hoàn tiền bao lâu? Vì sao có hold 7 ngày?',
    excerpt:
      'Hold giúp chống hủy đơn/chargeback — giải thích hold, pending và số dư rút được.',
    content: `## Các trạng thái tiền

- **Pending / chờ duyệt**: đơn mới ghi nhận.
- **Hold**: đã duyệt nhưng chờ hết thời gian rủi ro (đổi trả, hủy).
- **Số dư (balance)**: rút được.

## Vì sao hold?

Sàn có thể hủy hoa hồng nếu đơn hoàn/hủy. Hold bảo vệ cả nền tảng và dòng tiền.

## Khi nào nhả hold?

Theo số ngày cấu hình (mặc định khoảng 7 ngày) hoặc admin nhả tay / cron tự động.`,
  },
  {
    category: 'Tin tức',
    title: 'Top ngành hàng thường có hoa hồng Shopee tốt',
    excerpt:
      'Gợi ý nhóm ngành hay được set commission cao — không cam kết, thay đổi theo thời điểm.',
    content: `## Thường gặp (tham khảo)

- Làm đẹp / chăm sóc da
- Thời trang
- Phụ kiện điện thoại
- Đồ gia dụng / life style

## Không nên kỳ vọng cao

Điện máy, hàng chính hãng big sale đôi khi HH thấp hoặc loại trừ affiliate.

## Mẹo

Dùng ô **ước tính hoàn tiền** trên trang chủ (giả định) + mua qua link đúng để tối đa khả năng ghi nhận.`,
  },
  {
    category: 'Hướng dẫn hoàn tiền',
    title: 'Sub_id là gì? Vì sao quan trọng khi đối soát đơn',
    excerpt:
      'Sub_id gắn với mã user (U{id}_{mã}) giúp map đơn Shopee về đúng ví của bạn.',
    content: `## Sub_id

Mỗi user có mã ổn định dạng \`U2_DEMO2026\`. Mọi link bạn tạo đều mang sub_id này.

## Vì sao cần

Báo cáo Shopee Affiliate có cột Sub_id1. Hệ thống đọc CSV → map user → cộng hoàn.

## Bạn cần làm gì?

Không cần nhớ sub_id. Chỉ cần **luôn mua qua short link** do tài khoản bạn tạo khi đã đăng nhập.`,
  },
];

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const login = await api('/api/auth/login', {
  method: 'POST',
  body: { email: EMAIL, password: PASS },
});
if (!login.data.token) {
  console.error('Login fail', login.data);
  process.exit(1);
}
const token = login.data.token;

let ok = 0;
let skip = 0;
for (const p of posts) {
  const r = await api('/api/blog/admin', {
    method: 'POST',
    token,
    body: {
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      published: 1,
    },
  });
  if (r.status === 200 && r.data.slug) {
    console.log('OK', r.data.slug);
    ok++;
  } else {
    console.log('SKIP/FAIL', p.title, r.status, r.data.error || '');
    // duplicate title might create new slug still - if fail count
    if (r.data.error) skip++;
    else ok++;
  }
}
console.log(`Done: ${ok} created-ish, ${skip} failed`);
