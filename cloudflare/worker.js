export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lite-health") {
      return Response.json({
        ok: true,
        backend: "notulensi-lite-cloudflare",
        version: "v1"
      }, {
        headers: { "Cache-Control": "no-store" }
      });
    }

    if (url.pathname === "/") {
      return Response.redirect(new URL("/notulensi-lite.html", request.url), 302);
    }

    return env.ASSETS.fetch(request);
  }
};
