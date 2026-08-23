import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { networkInterfaces } from "node:os";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^\//, "").replace(/^(fx|mx)\//, "");
    let filePath = join(root, relativePath || "index.html");
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
    response.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
    response.end(await readFile(join(root, "404.html")));
  }
}).listen(port, "0.0.0.0", () => {
  const addresses = Object.values(networkInterfaces()).flat().filter((item) => item?.family === "IPv4" && !item.internal);
  console.log(`Local:   http://localhost:${port}`);
  for (const address of addresses) console.log(`Network: http://${address.address}:${port}`);
});
