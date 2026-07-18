/**
 * GEO / Information Gain modules — câu trả lời “snippet-ready” (~50–150 từ)
 * Nguồn phân tích khoảng trống vs Top SERP (ShopBack, app CashBack, help Shopee trả hàng,
 * affiliate seller guides): đối thủ ít nói rõ sub_id, hold clawback, bot 1–1, voucher+link.
 */

export const GEO_CITATION_MODULES = [
  {
    id: 'cashback-vs-refund',
    h2: 'Hoàn tiền Shopee cashback khác gì “trả hàng hoàn tiền” của Shopee?',
    answer:
      'Hai khái niệm hay bị nhầm. “Trả hàng/hoàn tiền” trên app Shopee là hoàn lại tiền đơn khi bạn trả SP (thường về ShopeePay/bank theo chính sách sàn, có thể 24h–vài ngày làm việc). “Hoàn tiền Shopee” trên HoanTienVN là cashback từ hoa hồng affiliate: bạn mua qua short link, đơn hợp lệ được đối soát, một phần hoa hồng (ví dụ ~70% HH) vào ví web, hold khoảng 7 ngày rồi rút bank/MoMo. Không thay thế chính sách trả hàng của Shopee.',
  },
  {
    id: 'how-percent',
    h2: 'Hoàn tiền Shopee trên HoanTienVN được bao nhiêu %?',
    answer:
      'Mức hoàn = hoa hồng affiliate thực tế của ngành hàng × tỷ lệ chia user (cấu hình site, mặc định 0,70 tức 70% HH). Ước tính khi lấy link dùng % HH mặc định (vd. 12%) × 70% ≈ 8,4% giá SP — chỉ tham khảo. Số vào ví lấy từ báo cáo Shopee Affiliate sau đối soát, không cam kết từng SP giống hệt banner app cashback “đến 38–60%”.',
  },
  {
    id: 'hold-why',
    h2: 'Vì sao hold hoàn tiền khoảng 7 ngày?',
    answer:
      'Shopee có thể hủy/hoàn đơn hoặc thu hồi hoa hồng affiliate nếu đơn không thành công (hủy, trả hàng, gian lận). Hold ~7 ngày (cấu hình site) giảm rủi ro chi hoàn rồi bị reverse. Tiền hold chưa rút được; hết hold mới vào số dư. Rút tối thiểu thường 50.000đ về bank hoặc MoMo sau khi admin duyệt yêu cầu.',
  },
  {
    id: 'sub-id',
    h2: 'Sub_id và short link an_redir dùng để làm gì?',
    answer:
      'Mỗi user HoanTienVN có sub_id riêng (dạng U{id}_{mã}). Short link /r/… redirect qua an_redir Shopee kèm affiliate_id master + sub_id của bạn. Báo cáo CSV Affiliate có cột Sub_id để map đơn về đúng ví. Không login / không qua short link → không map được hoàn. Đây là khác biệt so với app chỉ “mở Shopee rồi mua” mà không gắn mã user rõ trên từng link SP.',
  },
  {
    id: 'voucher-combo',
    h2: 'Có dùng mã giảm giá Shopee + hoàn tiền cùng lúc được không?',
    answer:
      'Thường được: lấy short link hoàn tiền trước → mở SP qua short link → áp voucher/freeship/xu trong giỏ → thanh toán trong 20–30 phút. Một số campaign đặc biệt có thể loại affiliate; ưu tiên đơn đủ điều kiện. Sai thứ tự (chỉ voucher, không short link) = không cashback. Adblock/VPN và click aff KOL khác giữa chừng dễ mất tracking.',
  },
  {
    id: 'vs-shopback',
    h2: 'HoanTienVN khác ShopBack / app cashback Shopee chỗ nào?',
    answer:
      'ShopBack/app cashback thường hoàn theo cửa hàng hoặc chương trình app, % và cap theo từng deal. HoanTienVN: web (không bắt buộc app), dán từng link SP, short link + sub_id, bot Telegram/Zalo sau khi liên kết 1–1 với web, hold minh bạch, rút bank/MoMo từ mức tối thiểu site. Phù hợp ai hay copy link từ app Shopee và muốn ví + đơn theo dõi trên một domain riêng.',
  },
];

/** FAQ mở rộng cho schema + UI (gồm information gain) */
export const GEO_FAQ_ITEMS = [
  {
    q: 'Làm sao để được hoàn tiền Shopee trên HoanTienVN?',
    a: 'Đăng ký web → dán link SP Shopee → lấy short link → mua/thanh toán qua short link trong 20–30 phút (giỏ sạch SP đó, tắt Adblock). Sau đối soát, hold ~7 ngày rồi rút bank/MoMo khi đủ min (thường 50k).',
  },
  {
    q: 'Hoàn tiền Shopee cashback khác gì trả hàng hoàn tiền?',
    a: 'Trả hàng/hoàn tiền = Shopee hoàn bill khi bạn trả SP. Cashback HoanTienVN = chia hoa hồng affiliate sau mua qua short link, vào ví web — không phải hoàn giá trị đơn 100%.',
  },
  {
    q: 'Hoàn bao nhiêu %? Có đến 40–60% không?',
    a: 'Thường = HH ngành × ~70% chia user. Ước tính lúc lấy link (vd. 12%×70%≈8,4%) chỉ tham khảo. Số “đến 40–60%” trên app khác là cap/campaign riêng, không áp dụng mặc định mọi đơn trên HoanTienVN.',
  },
  {
    q: 'Hold hoàn tiền bao lâu và vì sao?',
    a: 'Khoảng 7 ngày để giảm rủi ro hủy đơn/thu hồi hoa hồng affiliate. Hết hold mới rút được.',
  },
  {
    q: 'Vì sao không được hoàn tiền / không thấy đơn?',
    a: 'Hay gặp: không qua short link, click aff khác, giỏ cũ, Adblock, thanh toán chậm, hủy đặt lại. Lấy short link mới và mua lại; giữ mã đơn để hỗ trợ đối soát theo sub_id.',
  },
  {
    q: 'Có kết hợp mã giảm + hoàn tiền không?',
    a: 'Có: short link trước → vào app → áp voucher → thanh toán nhanh. Một số CTKM đặc biệt có thể ảnh hưởng affiliate.',
  },
  {
    q: 'Bot Telegram/Zalo dùng thế nào?',
    a: 'Login web → Dashboard tạo mã 6 số → Tele: /lienket 123456 · Zalo: lienket 123456 (không /). 1 web ↔ 1 bot. Chỉ dangky bot không lienket = không cùng ví web.',
  },
  {
    q: 'Rút tiền cashback về đâu?',
    a: 'Bank hoặc MoMo trên web khi số dư khả dụng ≥ mức tối thiểu (thường 50.000đ). Thời gian duyệt thường 1–3 ngày làm việc tùy admin.',
  },
  {
    q: 'Sub_id là gì?',
    a: 'Mã định danh user trên mọi short link, giúp map đơn từ báo cáo Shopee Affiliate về đúng ví HoanTienVN.',
  },
  {
    q: 'HoanTienVN có phải app không?',
    a: 'Chủ yếu website (PWA có thể thêm MH chính). Không bắt cài app store; có bot Tele hỗ trợ lấy link sau khi liên kết web.',
  },
];

export function geoFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GEO_FAQ_ITEMS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function softwareAppJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'HoanTienVN',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: 'https://www.hoantien.pro.vn',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'VND',
      description: 'Đăng ký và lấy link hoàn tiền Shopee miễn phí',
    },
    description:
      'Web hoàn tiền Shopee (cashback affiliate): dán link, short link sub_id, hold, rút bank/MoMo.',
  };
}
