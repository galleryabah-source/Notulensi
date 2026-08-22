# SEO Production Deployment

This marker intentionally triggers a production deployment after the SEO Admin Control Center integration.

Required production verification:
- Admin Settings exposes SEO / Google Indexing.
- `/seo-settings.html` requires an authenticated admin session.
- `/api/seo-config` is readable publicly and writable only by admin.
- Canonical host is `https://notulensi-rosy.vercel.app`.
- `/robots.txt` points to the production sitemap.
- `/sitemap.xml` uses the production canonical host.
