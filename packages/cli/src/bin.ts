#!/usr/bin/env node

import http from "http";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import WebSocket, { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "../../app");
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const CONFIG_PATH = path.join(os.homedir(), ".diorama", "config.json");

function loadGatewayUrl(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return config.gateway?.url ?? null;
  } catch {
    return null;
  }
}

async function startServer() {
  const next = (await import("next")).default;
  const app = next({ dev: true, dir: APP_DIR });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  // WebSocket proxy: browser <-> OpenClaw gateway
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/api/gateway/ws") {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        const gatewayUrl = loadGatewayUrl();
        if (!gatewayUrl) {
          clientWs.close(4001, "No gateway configured");
          return;
        }

        // Connect to the real gateway
        const gatewayOrigin = gatewayUrl.replace(/^ws/, "http").replace(/\/+$/, "");
        const gatewayWs = new WebSocket(gatewayUrl, { headers: { Origin: gatewayOrigin } });

        gatewayWs.on("open", () => {
          clientWs.send(JSON.stringify({ type: "event", event: "proxy.connected", payload: {} }));
        });

        // Proxy: gateway -> browser
        gatewayWs.on("message", (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(typeof data === "string" ? data : data.toString("utf-8"));
          }
        });

        // Proxy: browser -> gateway
        clientWs.on("message", (data) => {
          if (gatewayWs.readyState === WebSocket.OPEN) {
            gatewayWs.send(typeof data === "string" ? data : data.toString("utf-8"));
          }
        });

        gatewayWs.on("close", () => {
          clientWs.close(1000, "Gateway disconnected");
        });

        gatewayWs.on("error", () => {
          clientWs.close(4002, "Gateway connection error");
        });

        clientWs.on("close", () => {
          gatewayWs.close();
        });
      });
    } else {
      // Let Next.js handle other WebSocket upgrades (HMR)
      app.getUpgradeHandler()(req, socket, head);
    }
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  Diorama running at ${url}\n`);

    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${url}`);
  });
}

const args = process.argv.slice(2);

if (args[0] === "init") {
  const { scaffoldProject } = await import("./init.js");
  const name = args[1] ?? "my-diorama";
  const template = (args[2] as "starter" | "full-office" | "minimal") ?? "starter";
  scaffoldProject({ name, dir: path.resolve(process.cwd(), name), template });
  console.log(`\n  Created ${name}/ with template "${template}"\n`);
} else {
  startServer().catch((err) => {
    console.error("Failed to start Diorama:", err);
    process.exit(1);
  });
}
