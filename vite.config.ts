import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { accountHttp } from "./server/http";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
export default defineConfig({
  plugins: [
    {
      name: "local-accounts",
      configureServer(server) {
        server.middlewares.use((req, res, next) =>
          req.url?.startsWith("/api/account")
            ? void accountHttp(req, res)
            : next(),
        );
      },
    },
    react(),
    {
      name: "offline-shell",
      closeBundle() {
        const html = readFileSync("dist/index.html", "utf8");
        const assets = readdirSync("dist/assets").map(
          (name) => "/assets/" + name,
        );
        const sw = readFileSync("public/sw.js", "utf8")
          .replace("__BUILD__", Date.now().toString())
          .replace(
            "__ASSETS__",
            JSON.stringify([
              "/",
              "/index.html",
              "/manifest.webmanifest",
              "/icon-192.png",
              "/icon-512.png",
              ...assets,
            ]),
          );
        writeFileSync("dist/sw.js", sw);
      },
    },
  ],
});
