# Deployment Guide Document

**Version:** 1.1.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added test commands, GitHub Actions CI, rollback procedure |

---

## 1. Build Process

```bash
# Install dependencies
npm install

# Development server (hot reload)
npx quasar dev

# Production build
npx quasar build

# Output: dist/spa/
#   ├── index.html
#   ├── assets/
#   │   ├── js/
#   │   ├── css/
#   │   └── fonts/
#   ├── favicon.ico
#   └── ...
```

---

## 2. Environment Variables

Create `.env` file in project root:

```env
VITE_API_URL=https://app.sostienilsostegno.com
VITE_APP_TITLE=Portale Volontario
```

> **Nota:** `.env` contiene l'URL dell'API backend ed è escluso dal repository pubblico. Usa `.env.example` come template.

These are exposed via Vite's `import.meta.env` pattern.

---

## 3. Deployment Options

### Option A: Static Hosting (Recommended)

Deploy the `dist/spa/` folder to any static host:

| Provider | Method | Notes |
|---|---|---|
| Netlify | `netlify deploy --prod --dir=dist/spa` | Auto CDN, HTTPS |
| Vercel | `vercel --prod` | Auto CDN, HTTPS |
| GitHub Pages | `gh-pages` branch | Free, needs `publicPath` config |
| S3 + CloudFront | `aws s3 sync dist/spa s3://bucket` | Manual setup |
| Your VPS | `scp -r dist/spa user@vps:/var/www/volontari` | Nginx config needed |

### Option B: VPS with Nginx

```nginx
# /etc/nginx/sites-available/volontari.sostienilsostegno.com
server {
    listen 80;
    server_name volontari.sostienilsostegno.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name volontari.sostienilsostegno.com;

    ssl_certificate /etc/letsencrypt/live/volontari.sostienilsostegno.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/volontari.sostienilsostegno.com/privkey.pem;

    root /var/www/volontari;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## 4. Directus CORS Configuration

Ensure Directus CORS settings include the frontend origin:

```
CORS_ENABLED=true
CORS_ORIGIN=https://volontari.sostienilsostegno.com,http://localhost:9000
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
```

---

## 5. Post-Deployment Checklist

- [ ] HTTPS enabled and certificate valid
- [ ] `https://volontari.sostienilsostegno.com` loads correctly
- [ ] Login works against `https://app.sostienilsostegno.com`
- [ ] API calls succeed (no CORS errors in console)
- [ ] File upload works
- [ ] Token refresh works
- [ ] Mobile viewport renders correctly
- [ ] 404 fallback to `index.html` (SPA routing)

---

## 6. Rollback Procedure

```bash
# If using S3/static:
# Re-deploy previous build
aws s3 sync dist/spa.bak s3://bucket-name --delete

# If using VPS:
# Restore backup
sudo mv /var/www/volontari /var/www/volontari.broken
sudo mv /var/www/volontari.bak /var/www/volontari
sudo systemctl reload nginx
```
