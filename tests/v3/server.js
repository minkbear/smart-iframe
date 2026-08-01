/**
 * Tiny static server for v3 iframe-side testing.
 *
 * Same as `npx http-server` but answers POST/PUT/PATCH/DELETE by serving the
 * target file like a GET — needed because the fake Inertia app POSTs to static
 * JSON fixtures (a real Inertia backend would answer POST with page JSON).
 *
 * Usage: node tests/v3/server.js [port]   (default 8001, serves repo root)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 8001;
const ROOT = path.resolve(__dirname, '..', '..');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404).end('Not found: ' + urlPath);
            return;
        }
        const headers = {
            'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        };
        // Mimic an Inertia backend response for the JSON fixtures
        if (filePath.endsWith('.json')) {
            headers['X-Inertia'] = 'true';
        }
        res.writeHead(200, headers).end(data);
    });
}).listen(PORT, () => {
    console.log(`v3 test server (POST-friendly) on http://localhost:${PORT}, root: ${ROOT}`);
});
