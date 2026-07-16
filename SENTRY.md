# Sentry error monitoring

Code đã sẵn sàng. **Chỉ bật khi có DSN** — không set DSN thì Sentry tắt (không crash).

## 1. Tạo project free

1. https://sentry.io/signup/  
2. Create project:
   - **Node.js** → copy DSN → backend  
   - **React** → copy DSN → frontend  

(Có thể dùng 1 project cho cả hai nếu muốn.)

## 2. Backend (Render)

Environment → add:

```
SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Redeploy API.

## 3. Frontend (Vercel)

Project → Settings → Environment Variables (Production):

```
VITE_SENTRY_DSN=https://yyyy@o0.ingest.sentry.io/0
```

Redeploy frontend (`vercel --prod` hoặc git push nếu đã connect).

## 4. Verify

- Gây lỗi test hoặc `Sentry.captureMessage('hello')`
- Dashboard Sentry → Issues

## Files

| File | Vai trò |
|------|---------|
| `backend/src/sentry.js` | Init + Express error handler |
| `frontend/src/sentry.js` | Browser init |
| `frontend/src/main.jsx` | `initSentry()` |
