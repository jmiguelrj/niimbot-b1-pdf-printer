# SOP-006: Hardened Static Subpath Reverse-Proxy Deployment (`/labels/`)

## 1. Prerequisites
- **Build Artifact**: Fresh production bundle built locally via `npm run build` (`vite.config.ts` configured with `base: "./"` and relative `sw.js` precache URLs).
- **Target Host**: Linux Docker host running an existing reverse proxy (e.g., **Traefik v3** attached to an external Docker network such as `proxy`) serving TLS HTTPS for `https://app.example.com`.
- **Container Image**: `nginx:1.27-alpine` running read-only (`read_only: true`) with `tmpfs` mounts for `/var/cache/nginx`, `/var/run`, and `/tmp`.
- **Browser Hardware Requirements**:
  - HTTPS context with `Permissions-Policy` permitting `serial=(self)`, `bluetooth=(self)`, and `usb=(self)`.
  - Explicit Nginx MIME mapping for `.mjs` (`application/javascript`) so `pdf.worker.min-*.mjs` loads cleanly under strict ES module worker rules.
  - Strict Traefik middleware ordering: trailing-slash redirect (`/labels` → `/labels/`) executes **before** `stripprefix` (`/labels`), ensuring relative `./assets/*` and `./sw.js` paths never resolve against `/`.

---

## 2. Execution Steps

1. **Build and Verify Local Static Bundle**:
   ```powershell
   Set-Location C:\repos\Niimbot\niimbot-b1-pdf-printer
   npm audit
   npm run check
   npm run build
   ```

2. **Prepare Isolated Deployment Directory on Proxy Host (`deploy@proxy.example.com`)**:
   ```bash
   ssh deploy@proxy.example.com "mkdir -p /opt/niimbot-label-studio/html"
   scp -r dist/* deploy@proxy.example.com:/opt/niimbot-label-studio/html/
   ```

3. **Create Hardened `security_headers.conf` (`/opt/niimbot-label-studio/security_headers.conf`)**:
   Include this snippet inside every Nginx `location` block so `Cache-Control` overrides never drop security headers:
   ```nginx
   add_header Permissions-Policy "serial=(self), bluetooth=(self), usb=(self), camera=(), microphone=(), geolocation=()" always;
   add_header Content-Security-Policy "default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```

4. **Create Nginx Configuration (`/opt/niimbot-label-studio/nginx.conf`)**:
   ```nginx
   worker_processes auto;
   pid /tmp/nginx.pid;
   error_log /dev/stderr warn;

   events {
       worker_connections 1024;
   }

   http {
       include /etc/nginx/mime.types;
       types {
           application/javascript mjs;
           application/manifest+json webmanifest;
       }
       default_type application/octet-stream;

       access_log /dev/stdout;
       sendfile on;
       tcp_nopush on;
       keepalive_timeout 65;
       server_tokens off;

       client_body_temp_path /tmp/client_temp;
       proxy_temp_path /tmp/proxy_temp;
       fastcgi_temp_path /tmp/fastcgi_temp;
       uwsgi_temp_path /tmp/uwsgi_temp;
       scgi_temp_path /tmp/scgi_temp;

       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css application/javascript application/json application/manifest+json image/svg+xml;

       server {
           listen 80;
           server_name _;
           root /usr/share/nginx/html;
           index index.html;

           location = /index.html {
               include /etc/nginx/security_headers.conf;
               add_header Cache-Control "no-cache" always;
           }

           location = /sw.js {
               include /etc/nginx/security_headers.conf;
               add_header Cache-Control "no-cache" always;
           }

           location = /manifest.webmanifest {
               include /etc/nginx/security_headers.conf;
               add_header Cache-Control "no-cache" always;
           }

           location ^~ /assets/ {
               include /etc/nginx/security_headers.conf;
               add_header Cache-Control "public, max-age=31536000, immutable" always;
               try_files $uri =404;
           }

           location / {
               include /etc/nginx/security_headers.conf;
               add_header Cache-Control "no-cache" always;
               try_files $uri $uri/ =404;
           }
       }
   }
   ```

5. **Create Isolated Compose Stack (`/opt/niimbot-label-studio/docker-compose.yml`)**:
   Replace `app.example.com` and the external proxy network name (`proxy`) with your host values:
   ```yaml
   services:
     niimbot-label-studio:
       image: nginx:1.27-alpine
       container_name: niimbot-label-studio
       restart: unless-stopped
       read_only: true
       tmpfs:
         - /var/cache/nginx
         - /var/run
         - /tmp
       volumes:
         - ./html:/usr/share/nginx/html:ro
         - ./nginx.conf:/etc/nginx/nginx.conf:ro
         - ./security_headers.conf:/etc/nginx/security_headers.conf:ro
       networks:
         - proxy
       labels:
         - "traefik.enable=true"
         - "traefik.docker.network=proxy"
         - "traefik.http.routers.niimbot-labels-http.entryPoints=http"
         - "traefik.http.routers.niimbot-labels-http.rule=Host(`app.example.com`) && PathPrefix(`/labels`)"
         - "traefik.http.routers.niimbot-labels-http.priority=200"
         - "traefik.http.routers.niimbot-labels-http.middlewares=niimbot-https-redirect"
         - "traefik.http.middlewares.niimbot-https-redirect.redirectscheme.scheme=https"
         - "traefik.http.middlewares.niimbot-https-redirect.redirectscheme.permanent=true"
         - "traefik.http.routers.niimbot-labels-https.entryPoints=https"
         - "traefik.http.routers.niimbot-labels-https.rule=Host(`app.example.com`) && PathPrefix(`/labels`)"
         - "traefik.http.routers.niimbot-labels-https.priority=200"
         - "traefik.http.routers.niimbot-labels-https.tls=true"
         - "traefik.http.routers.niimbot-labels-https.tls.certresolver=letsencrypt"
         - "traefik.http.routers.niimbot-labels-https.middlewares=niimbot-slash,niimbot-strip"
         - "traefik.http.routers.niimbot-labels-https.service=niimbot-labels-svc"
         - "traefik.http.middlewares.niimbot-slash.redirectregex.regex=^(https?://[^/]+/labels)$$"
         - "traefik.http.middlewares.niimbot-slash.redirectregex.replacement=$${1}/"
         - "traefik.http.middlewares.niimbot-slash.redirectregex.permanent=true"
         - "traefik.http.middlewares.niimbot-strip.stripprefix.prefixes=/labels"
         - "traefik.http.services.niimbot-labels-svc.loadbalancer.server.port=80"

   networks:
     proxy:
       external: true
   ```

6. **Start Only the Isolated Label Studio Container**:
   ```bash
   cd /opt/niimbot-label-studio && docker compose up -d
   ```
   *(Do **not** restart or modify the host reverse proxy or root application containers.)*

7. **Verify Production Headers, MIME Types & Zero Regression on Root App**:
   ```bash
   curl -sI https://app.example.com
   curl -sI https://app.example.com/labels
   curl -sI https://app.example.com/labels/
   curl -sI https://app.example.com/labels/assets/pdf.worker.min-<hash>.mjs
   curl -sI https://app.example.com/labels/manifest.webmanifest
   curl -sI https://app.example.com/labels/sw.js
   ```

---

## 3. Expected Output
- **Root Application (`/`)**: Unchanged response status and headers (`zero regression`).
- **Subpath Redirect (`/labels`)**: `308 Permanent Redirect` (or `301`) with `location: https://app.example.com/labels/`.
- **App Entry (`/labels/`)**: `200 OK`, `content-type: text/html`, `cache-control: no-cache`, `content-security-policy: default-src 'self'...`, and `permissions-policy: serial=(self), bluetooth=(self), usb=(self)...`.
- **PDF.js ES Module Worker (`/labels/assets/pdf.worker.min-<hash>.mjs`)**: `200 OK`, `content-type: application/javascript`, and `cache-control: public, max-age=31536000, immutable`.
- **PWA Manifest & Service Worker**: `/labels/manifest.webmanifest` (`200 OK`, `application/manifest+json`) and `/labels/sw.js` (`200 OK`, `application/javascript`, `cache-control: no-cache`).

---

## 4. Rollback
1. **Remove Isolated Static Container & Files on Proxy Host**:
   ```bash
   ssh deploy@proxy.example.com "cd /opt/niimbot-label-studio && docker compose down && rm -rf /opt/niimbot-label-studio"
   ```
   Traefik automatically deregisters the `/labels` router when `niimbot-label-studio` stops, leaving the root host application untouched.
2. **Revert Repository Release Tag / Visibility (if needed)**:
   ```powershell
   gh repo edit jmiguelrj/niimbot-b1-pdf-printer --visibility private --accept-visibility-change-consequences
   git tag -d v1.0.0
   git push origin :refs/tags/v1.0.0
   ```
