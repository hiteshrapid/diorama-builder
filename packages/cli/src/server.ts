import http from "http";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import WebSocket, { WebSocketServer } from "ws";
import { getGlobalBroadcaster } from "@diorama/engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, "../../app");
const DIORAMA_HOME = path.join(os.homedir(), ".diorama");
const CONFIG_PATH = path.join(DIORAMA_HOME, "config.json");
const RUNTIME_PATH = path.join(DIORAMA_HOME, "runtime.json");

function loadGatewayUrl(): string | null {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return config.gateway?.url ?? null;
  } catch {
    return null;
  }
}

function writeRuntimeInfo(port: number) {
  try {
    fs.mkdirSync(DIORAMA_HOME, { recursive: true });
    fs.writeFileSync(
      RUNTIME_PATH,
      JSON.stringify({ pid: process.pid, port, startedAt: Date.now() }, null, 2),
    );
  } catch (err) {
    console.warn("  [diorama] could not write runtime.json:", err);
  }
}

function clearRuntimeInfo() {
  try {
    if (fs.existsSync(RUNTIME_PATH)) fs.unlinkSync(RUNTIME_PATH);
  } catch {
    // ignore
  }
}

export interface StartServerOptions {
  headless?: boolean;
  port?: number;
}

export interface RunningServer {
  port: number;
  url: string;
  close: () => Promise<void>;
}

/**
 * Start the Diorama Next.js server with WebSocket upgrade handlers for
 * /api/gateway/ws (proxy to OpenClaw) and /api/events/stream (broadcaster fan-out).
 * Writes ~/.diorama/runtime.json so other processes can find the running port.
 */
export async function startServer(
  options: StartServerOptions = {},
): Promise<RunningServer> {
  const port = options.port ?? parseInt(process.env.PORT ?? "3000", 10);
  const headless = options.headless ?? false;

  const next = (await import("next")).default;
  const app = next({ dev: true, dir: APP_DIR });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/api/gateway/ws") {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        const gatewayUrl = loadGatewayUrl();
        if (!gatewayUrl) {
          clientWs.close(4001, "No gateway configured");
          return;
        }

        const gatewayOrigin = gatewayUrl.replace(/^ws/, "http").replace(/\/+$/, "");
        const gatewayWs = new WebSocket(gatewayUrl, { headers: { Origin: gatewayOrigin } });

        gatewayWs.on("open", () => {
          clientWs.send(JSON.stringify({ type: "event", event: "proxy.connected", payload: {} }));
        });

        gatewayWs.on("message", (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(typeof data === "string" ? data : data.toString("utf-8"));
          }
        });

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
    } else if (req.url === "/api/events/stream") {
      wss.handleUpgrade(req, socket, head, (clientWs) => {
        const broadcaster = getGlobalBroadcaster();
        const dispose = broadcaster.subscribe((frame) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(frame);
          }
        });
        clientWs.send(
          JSON.stringify({ type: "subscribed", channel: "diorama-events" }),
        );
        clientWs.on("close", dispose);
        clientWs.on("error", dispose);
      });
    } else {
      app.getUpgradeHandler()(req, socket, head);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      writeRuntimeInfo(port);
      console.log(`\n  Diorama running at ${url}\n`);

      if (!headless) {
        const cmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        exec(`${cmd} ${url}`);
      }

      resolve({
        port,
        url,
        close: () =>
          new Promise<void>((closeResolve) => {
            clearRuntimeInfo();
            server.close(() => closeResolve());
          }),
      });
    });
    server.on("error", (err) => {
      reject(err);
    });
  });
}

export { clearRuntimeInfo, DIORAMA_HOME, RUNTIME_PATH };
