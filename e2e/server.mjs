// Serves a build the way GitHub Pages does: under a subpath, with 404.html (and status 404) for any
// unknown path. The e2e tests run against it, so the deployed SPA fallback is tested too.
// Usage: node e2e/server.mjs <dir> <port> <basePath>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const [dir, port, basePath] = process.argv.slice(2);
const root = path.resolve(dir);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const send = async (res, status, file) => {
  const body = await readFile(file);
  res.writeHead(status, {
    "Content-Type": contentTypes[path.extname(file)] ?? "application/octet-stream",
  });
  res.end(body);
};

createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, "http://localhost");
  // like Pages: the site root without the trailing slash is redirected
  if (`${pathname}/` === basePath) {
    res.writeHead(301, { Location: basePath + search }).end();
    return;
  }
  if (!pathname.startsWith(basePath)) {
    res.writeHead(404).end();
    return;
  }

  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(basePath.length)) || "index.html";
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = path.join(root, relative);
  // no way out of the build dir through "..", like on a real static host
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(404).end();
    return;
  }

  try {
    await send(res, 200, file);
  } catch {
    // a directory or a missing file: the SPA fallback page (none in a dev build: a plain 404)
    await send(res, 404, path.join(root, "404.html")).catch(() => res.writeHead(404).end());
  }
}).listen(Number(port), () => console.log(`serving ${dir} at http://localhost:${port}${basePath}`));
