/** SEO defaults & per-route meta — HoanTienVN */

export const SITE_URL = 'https://www.hoantien.pro.vn';
export const SITE_NAME = 'HoanTienVN';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-app.jpg`;
export const SUPPORT_EMAIL = 'hotro@hoantien.pro.vn';

export const DEFAULT_SEO = {
  title: 'Hoàn tiền Shopee uy tín | Cashback về ví – HoanTienVN',
  description:
    'Hoàn tiền Shopee (cashback): dán link sản phẩm, lấy short link, mua như bình thường, nhận tiền về ví. Rút bank/MoMo từ 50k. Hướng dẫn rõ, hold minh bạch.',
  keywords:
    'hoàn tiền shopee, cashback shopee, link hoàn tiền shopee, web hoàn tiền shopee, hướng dẫn hoàn tiền shopee',
};

/** path without trailing slash except home */
export const PAGE_SEO = {
  '/': {
    title: 'Hoàn tiền Shopee uy tín | Cashback về ví – HoanTienVN',
    description:
      'Web hoàn tiền Shopee: dán link → short link → mua → tiền vào ví. Cashback từ hoa hồng affiliate, hold ~7 ngày, rút bank/MoMo. Dùng free tại HoanTienVN.',
    keywords:
      'hoàn tiền shopee, cashback shopee, link hoàn tiền shopee, web hoàn tiền shopee, hoantienvn',
  },
  '/guide': {
    title: 'Hướng dẫn hoàn tiền Shopee từng bước (2026) | HoanTienVN',
    description:
      'Cách hoàn tiền Shopee A–Z: đăng ký web, lấy link hoàn tiền, mua đúng short link, liên kết Telegram/Zalo, hold 7 ngày và rút tiền. Checklist không mất hoàn.',
    keywords:
      'hướng dẫn hoàn tiền shopee, cách lấy link hoàn tiền shopee, cách hoàn tiền shopee, liên kết telegram hoàn tiền',
  },
  '/blog': {
    title: 'Blog hoàn tiền Shopee & mẹo săn sale | HoanTienVN',
    description:
      'Cẩm nang cashback Shopee: hold, rút MoMo, lỗi không được hoàn tiền, bot Telegram, sub_id, săn sale kết hợp hoàn tiền. Cập nhật 2026.',
    keywords:
      'blog hoàn tiền shopee, mẹo cashback shopee, săn sale shopee hoàn tiền',
  },
  '/register': {
    title: 'Đăng ký hoàn tiền Shopee miễn phí | HoanTienVN',
    description:
      'Tạo tài khoản HoanTienVN để nhận cashback Shopee về ví. Đăng ký email hoặc Google, lấy link hoàn tiền và theo dõi đơn.',
    keywords: 'đăng ký hoàn tiền shopee, tạo tài khoản cashback shopee',
  },
  '/login': {
    title: 'Đăng nhập | HoanTienVN',
    description: 'Đăng nhập ví hoàn tiền Shopee HoanTienVN.',
    noindex: true,
  },
  '/terms': {
    title: 'Điều khoản sử dụng | HoanTienVN',
    description:
      'Điều khoản sử dụng dịch vụ hoàn tiền Shopee HoanTienVN: quyền, nghĩa vụ, hold và rút tiền.',
  },
  '/privacy': {
    title: 'Chính sách bảo mật | HoanTienVN',
    description:
      'Chính sách bảo mật dữ liệu người dùng HoanTienVN – web hoàn tiền Shopee.',
  },
  '/cookies': {
    title: 'Chính sách Cookie | HoanTienVN',
    description: 'Cách HoanTienVN sử dụng cookie trên website hoàn tiền Shopee.',
  },
  '/forgot-password': {
    title: 'Quên mật khẩu | HoanTienVN',
    description: 'Đặt lại mật khẩu tài khoản HoanTienVN.',
    noindex: true,
  },
  '/reset-password': {
    title: 'Đặt lại mật khẩu | HoanTienVN',
    noindex: true,
  },
  '/dashboard': { title: 'Dashboard | HoanTienVN', noindex: true },
  '/orders': { title: 'Đơn hàng | HoanTienVN', noindex: true },
  '/withdraw': { title: 'Rút tiền | HoanTienVN', noindex: true },
  '/claim': { title: 'Khai báo đơn | HoanTienVN', noindex: true },
  '/referrals': { title: 'Mời bạn bè | HoanTienVN', noindex: true },
  '/admin': { title: 'Admin | HoanTienVN', noindex: true },
};

export function resolvePageSeo(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  if (PAGE_SEO[path]) return { ...DEFAULT_SEO, ...PAGE_SEO[path], path };
  if (path.startsWith('/blog/')) {
    return {
      ...DEFAULT_SEO,
      title: 'Bài viết | Blog hoàn tiền Shopee – HoanTienVN',
      description: DEFAULT_SEO.description,
      path,
    };
  }
  return { ...DEFAULT_SEO, path: path || '/' };
}

export function absoluteUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${p}`;
}

export const HOME_FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Làm sao để được hoàn tiền Shopee?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Đăng ký HoanTienVN, dán link sản phẩm Shopee, lấy short link hoàn tiền, mua và thanh toán qua short link trong 20–30 phút. Sau đối soát, tiền hold rồi vào ví để rút bank/MoMo.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hoàn tiền Shopee được bao nhiêu phần trăm?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Mức hoàn là phần chia hoa hồng affiliate (thường phần lớn cho user theo cấu hình site). Ước tính hiện khi lấy link; số thật theo báo cáo Shopee Affiliate sau đối soát.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hold hoàn tiền Shopee bao lâu?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Thường khoảng 7 ngày để giảm rủi ro hủy/hoàn đơn. Hết hold, tiền vào số dư rút được khi đủ mức tối thiểu (thường 50.000đ).',
      },
    },
    {
      '@type': 'Question',
      name: 'Vì sao không được hoàn tiền Shopee?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Thường do mua không qua short link, click aff/KOL khác, giỏ cũ, Adblock, thanh toán quá chậm, hoặc hủy đặt lại không qua link. Hãy lấy short link mới và mua lại đúng quy trình.',
      },
    },
    {
      '@type': 'Question',
      name: 'Rút tiền cashback Shopee về đâu?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Rút về ngân hàng hoặc MoMo trên website khi số dư khả dụng đạt mức tối thiểu. Gửi yêu cầu rút và chờ admin xử lý.',
      },
    },
  ],
};

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    email: SUPPORT_EMAIL,
    sameAs: ['https://t.me/hoantienvn_shopee_bot'],
    description: DEFAULT_SEO.description,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'vi-VN',
    potentialAction: {
      '@type': 'RegisterAction',
      target: `${SITE_URL}/register`,
      name: 'Đăng ký hoàn tiền Shopee',
    },
  };
}

export function howToGuideJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Hướng dẫn hoàn tiền Shopee trên HoanTienVN',
    description:
      'Các bước lấy link hoàn tiền Shopee, mua đúng short link và rút tiền về bank/MoMo.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Đăng ký hoặc login web',
        text: 'Tạo tài khoản trên HoanTienVN — đây là ví chính.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Lấy link hoàn tiền',
        text: 'Dán link Shopee trên web hoặc bot đã liên kết để nhận short link.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Mua qua short link',
        text: 'Mở short link, thanh toán trong 20–30 phút, không click aff khác.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Chờ đối soát và hold',
        text: 'Đơn được ghi nhận theo sub_id, hold khoảng 7 ngày.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: 'Rút tiền',
        text: 'Khi đủ số dư, rút bank hoặc MoMo trên website.',
      },
    ],
  };
}

export function articleJsonLd({ title, description, path, datePublished }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: absoluteUrl(path),
    datePublished: datePublished || undefined,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
    },
    image: DEFAULT_OG_IMAGE,
    inLanguage: 'vi-VN',
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
