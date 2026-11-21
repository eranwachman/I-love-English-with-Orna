// Tiny static server for local preview: node scripts/serve.mjs
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
http.createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[\/])+/, "");
  if (p.endsWith("/") || p.endsWith("\\")) p += "index.html";
  try {
    const body = await readFile(join(root, p));
    res.writeHead(200, { "Content-Type": types[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("Not found"); }
}).listen(5180, () => console.log("http://localhost:5180"));
