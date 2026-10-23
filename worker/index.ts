/**
 * Cloudflare Worker in front of the static export. It only handles /hub/*
 * (see `run_worker_first` in wrangler.jsonc); everything else goes straight to
 * the static assets.
 *
 * Business hub reports:
 * - If the HUB_SOURCE variable is set (a base URL such as
 *   https://raw.githubusercontent.com/<you>/<repo>/main/hub), each request
 *   fetches the latest coal.html / fx.html from there, so updated reports show
 *   up without redeploying the site.
 * - Otherwise, or if that fetch fails, it serves the copy bundled in public/hub/.
 * Responses are never cached, so every click in Business hub gets the newest copy.
 */

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
  HUB_SOURCE?: string;
}

const REPORTS = new Set(['coal', 'fx']);

function noStore(res: Response, source: string): Response {
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Hub-Source', source);
  return new Response(res.body, { status: res.status, headers });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/hub\/([a-z]+)(?:\.html|\/)?$/);
    const name = match?.[1];
    if (!name || !REPORTS.has(name)) return env.ASSETS.fetch(request);

    if (env.HUB_SOURCE) {
      try {
        const remote = await fetch(`${env.HUB_SOURCE.replace(/\/$/, '')}/${name}.html?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (remote.ok) {
          const res = new Response(remote.body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          return noStore(res, 'remote');
        }
      } catch {
        // fall through to the bundled copy
      }
    }

    // Ask the asset worker for the extension-less path so html_handling does not redirect.
    const assetUrl = new URL(`/hub/${name}`, url);
    return noStore(await env.ASSETS.fetch(new Request(assetUrl, request)), 'bundled');
  },
};

export default worker;
