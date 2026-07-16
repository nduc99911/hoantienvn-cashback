# SEO · Domain · Google Search Console

## 1. Domain riêng (khuyến nghị)

### Frontend (Vercel)
1. Mua domain (Namecheap / Cloudflare / Pa Việt…)
2. Vercel project **hoantienvn** → **Settings → Domains** → Add `www.yourdomain.com`
3. Trỏ DNS theo hướng dẫn Vercel (A / CNAME)

### Backend (Render)
1. Render service → **Settings → Custom Domain**
2. CNAME `api.yourdomain.com` → `hoantienvn-api.onrender.com`

### Env sau khi có domain

**Vercel**
```
VITE_API_URL=https://api.yourdomain.com
```

**Render**
```
SITE_URL=https://www.yourdomain.com
PUBLIC_URL=https://api.yourdomain.com
```

**Admin / settings DB**
- `site_url` = `https://www.yourdomain.com`

Redeploy FE + API.

## 2. Google Search Console

1. https://search.google.com/search-console
2. **Add property** → Domain hoặc URL prefix `https://www.yourdomain.com`
3. Xác minh:
   - **HTML tag** (dễ): copy `content="...."`  
     → Render env `GSC_VERIFICATION=....`  
     **hoặc** Admin settings key `gsc_verification`  
     → frontend đọc từ `/api/public/config` (meta tag động)
   - Hoặc DNS TXT (property Domain)
4. **Sitemaps** → Submit:
   ```
   https://api.yourdomain.com/api/public/sitemap.xml
   ```
   hoặc qua proxy nếu bạn mount sitemap trên domain chính.
5. **URL Inspection** → Request indexing trang chủ.

## 3. Đã có sẵn trong code

| Mục | URL / file |
|-----|------------|
| Sitemap | `GET /api/public/sitemap.xml` |
| Robots (API) | `GET /api/public/robots.txt` |
| Robots (FE static) | `frontend/public/robots.txt` |
| Meta description / OG | `index.html` + `SeoHead` |
| Legal | `/terms` `/privacy` `/cookies` |

## 4. Checklist SEO on-page

- [ ] Title ≤ 60 ký tự, description ≤ 160
- [ ] 1 thẻ H1 / trang
- [ ] HTTPS + canonical (domain chính)
- [ ] Sitemap submit GSC
- [ ] Không index `/admin` (robots Disallow)
- [ ] Blog bài viết có slug sạch

## 5. Lưu ý

- Free Render sleep: sitemap vẫn crawl được khi warm / keep-alive.
- Đổi domain → cập nhật Affiliate short link `SITE_URL` để `/r/xxx` đúng host (short link hiện trỏ API host).
