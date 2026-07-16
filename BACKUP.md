# Backup Supabase

## Cách 1 — GitHub Actions (khuyến nghị, free)

Workflow: `.github/workflows/backup-supabase.yml`

1. Repo → **Settings → Secrets → Actions**
2. Thêm secret **`DATABASE_URL`** = connection string pooler Supabase  
   (cùng URI production, **không** commit)
3. **Actions → Backup Supabase → Run workflow** (chạy thử)
4. Mỗi ngày 09:00 VN tự backup → **Artifacts** giữ **14 ngày**

Tải artifact: Actions → run → Artifacts → `supabase-backup-…`

## Cách 2 — Chạy tay (local)

```bash
cd backend
# .env đã có DATABASE_URL
node scripts/backup-supabase.mjs
# hoặc
node scripts/backup-supabase.mjs --out=./backups
```

Output:
- `backups/hoantienvn-<timestamp>.json` — full dump
- `backups/hoantienvn-<timestamp>.sql` — INSERT (best-effort)
- `backups/latest.json` — pointer file gần nhất

## Restore (tham khảo)

1. Tạo project Supabase mới / schema `schema.sql`
2. Import JSON bằng script riêng hoặc dùng SQL dump cẩn thận (ON CONFLICT DO NOTHING)
3. Production: ưu tiên restore từ JSON + script map bảng

## Supabase Dashboard

- **Settings → Database → Backups**: PITR / daily backup (plan paid)
- Free tier: **không** có PITR dài — dùng Actions artifact là đủ MVP

## Bảo mật

- Không commit file `backups/*.json` (đã gitignore nếu cần)
- Artifact GitHub chỉ member repo thấy
- Rotate `DATABASE_URL` password định kỳ
