# Notulensi — Self-Hosted Production on Windows

Target: run the public Notulensi application and its API on a Windows PC while keeping PostgreSQL private and exposing only HTTPS to the public internet.

## Runtime topology

```text
Public browser
    |
    | HTTPS 443
    v
Public edge / reverse proxy / secure tunnel
    |
    | private connection
    v
Windows PC (origin)
    |
    +-- Node.js -> 127.0.0.1:3000 -> Notulensi
    |
    +-- PostgreSQL -> 127.0.0.1:5432
    |
    +-- Windows Task Scheduler -> automatic restart
```

The application runtime is `server/self-host.mjs`. It serves the existing static files and dispatches `/api/<name>` and `/api/<name>.js` to the corresponding handler under `api/`. The same API modules remain usable by Vercel.

## 1. Prepare the PC

Install Node.js 24 LTS or newer and Git. Keep the PC awake while it is serving the site. Disable automatic sleep for the server power plan.

Clone the repository into `C:\Notulensi` and check out `fix/lite-solid-core` until the self-host production gate is accepted.

```powershell
Set-Location C:\
git clone https://github.com/galleryabah-source/Notulensi.git Notulensi
Set-Location C:\Notulensi
git checkout fix/lite-solid-core
npm install --omit=dev
npm run self-host:check
```

## 2. Configure production secrets

Run PowerShell as Administrator:

```powershell
Set-Location C:\Notulensi
.\scripts\configure-notulensi-windows.ps1
```

The script creates a unique password salt, PBKDF2 password hash, and session secret, then stores them as Windows Machine environment variables. Real secrets are never committed to Git.

## 3. Start automatically at boot

Run PowerShell as Administrator:

```powershell
Set-Location C:\Notulensi
.\scripts\install-notulensi-windows.ps1
```

This registers `Notulensi Production` in Windows Task Scheduler and starts the application.

Local smoke test:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/health
```

Expected response contains `"ok":true`.

## 4. Public HTTPS

Never expose PostgreSQL port 5432 publicly.

The Node origin should remain bound to `127.0.0.1:3000`. A public HTTPS edge must forward traffic to this local origin. The repository contains `Caddyfile.example` for a same-PC Caddy reverse proxy.

For an internet-facing monetized site, the preferred final topology is:

```text
https://your-domain.example
        |
        v
public HTTPS edge
        |
   encrypted private tunnel
        |
        v
127.0.0.1:3000 on the Windows PC
```

If the ISP provides a stable public IP and inbound HTTPS is permitted, a router can forward only TCP 443 to the reverse proxy on the PC. Do not forward 3000 or 5432.

## 5. Production validation

Before declaring the site live, verify:

1. `/health` returns HTTP 200.
2. `/` returns the Notulensi landing page.
3. `/api/admin-login` rejects unauthenticated access correctly.
4. Admin authentication creates the session cookie over HTTPS.
5. Lite Record/Transcript reads and writes shared PostgreSQL state.
6. Version conflicts remain protected.
7. Recording audio remains client-side/IndexedDB as designed; the browser does not expose PostgreSQL.
8. Database backups complete and at least one backup is stored off the PC.
9. The public domain resolves to the HTTPS edge.
10. Production SEO uses the final custom domain rather than the old Vercel canonical URL.

## 6. Important operational rules

- Do not commit `.env` or real credentials.
- Do not expose PostgreSQL to the public internet.
- Do not run development servers as the production service.
- Do not depend on an interactive terminal staying open.
- Do not make Cloudflare Workers/Pages the production runtime for this deployment.
- Keep an off-site database backup because the origin PC is a single physical failure domain.
