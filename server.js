// Static file server for local tests. It has no dependencies.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8124;
// Only this computer can connect. Set HOST=0.0.0.0 to connect from another device on your network.
const HOST = process.env.HOST || "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split("?")[0]);
    } catch (e) {
      send(res, 400, "Bad request"); // malformed %-encoding
      return;
    }
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, path.normalize(urlPath));
    const rel = path.relative(ROOT, filePath);
    // Serve only files in ROOT. Do not serve hidden files or folders, such as .git or .claude.
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || rel.split(path.sep).some((p) => p.startsWith("."))) {
      send(res, 403, "Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        send(res, 404, "Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, HOST, () => console.log(`Part-Writing Detective server running at http://localhost:${PORT}`));
