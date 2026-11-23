import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) throw new Error();
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, {
          Location: url.pathname.replace(/^\/+/, '/') + '/' + url.search,
        });
        return res.end();
      }
      path = resolve(path, 'index.html');
    }
    const content = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
