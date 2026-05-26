# Deployment Guide Document

**Version:** 2.0.0
**Last Updated:** 2026-05-25
**Status:** Final

## Change Log

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-25 | 1.0.0 | System | Initial draft |
| 2026-05-25 | 1.1.0 | System | Final — added test commands, GitHub Actions CI, rollback procedure |
| 2026-05-25 | 2.0.0 | System | Final — added .env.example reference, updated build notes |

---

## 1. Build Process

```bash
# Install dependencies
npm install

# Development server (hot reload)
npx quasar dev

# Production build
npx quasar build

# Run e2e tests (requires dev server or CI mode)
npm run test:e2e

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

Create `.env` file in project root using the template:

```bash
cp .env.example .env
```

```env
VITE_API_URL=https://app.sostienilsostegno.com
VITE_APP_TITLE=Portale Volontario
```

> **Nota:** `.env` contiene l'URL dell'API backend ed è escluso dal repository pubblico.  
> Usa `.env.example` come template (committato nel repo).

These are exposed via Vite's `import.meta.env` pattern.

---

## 3. Environment Configuration

The API URL is configured in `quasar.config.cjs`:

```js
env: {
  API_URL: ctx.dev
    ? 'http://localhost:9000/api'      // Development proxy
    : 'https://app.sostienilsostegno.com' // Production
}
```

The Quasar dev server runs on port 9000 with history mode routing:

```cjs
devServer: {
  port: 9000,
  open: false
}
```

---

## 4. Deployment Options

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

## 5. Directus CORS Configuration

Ensure Directus CORS settings include the frontend origin:

```
CORS_ENABLED=true
CORS_ORIGIN=https://volontari.sostienilsostegno.com,http://localhost:9000
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PATCH,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
```

---

## 6. Directus Permissions

The Volontario role must have read access to:

| Collection | Minimum Fields | Notes |
|---|---|---|
| `contatti` | `id_contatto, Nome, Cognome, Numero_di_cellulare, Numero_di_telefono, user_id` | For genitori display |
| `email` | `id, email_address, Contatto_Relation, Primary` | For email display (separate query) |
| `Famiglie` | `id_famiglia, Nome_Famiglia, IBAN, Intestatario_CC, Progetti.*` | Main family data |
| `Famiglie_Contatti` | All | Junction table for role resolution |
| `Progetti` | As needed | Project data |
| `Giustificativi` | All | CRUD operations |
| `Rendicontazioni` | `id, Tranche, Stato` | For tranche assignment |
| `directus_files` | As needed | File upload/download |

---

## 7. Post-Deployment Checklist

- [ ] HTTPS enabled and certificate valid
- [ ] `https://volontari.sostienilsostegno.com` loads correctly
- [ ] Login works against `https://app.sostienilsostegno.com`
- [ ] API calls succeed (no CORS errors in console)
- [ ] File upload works
- [ ] Token refresh works (wait 15 min, verify no redirect to login)
- [ ] Mobile viewport renders correctly
- [ ] 404 fallback to `index.html` (SPA routing)
- [ ] Directus role permissions verified

---

## 8. Rollback Procedure

```bash
# If using S3/static:
aws s3 sync dist/spa.bak s3://bucket-name --delete

# If using VPS:
sudo mv /var/www/volontari /var/www/volontari.broken
sudo mv /var/www/volontari.bak /var/www/volontari
sudo systemctl reload nginx
```
