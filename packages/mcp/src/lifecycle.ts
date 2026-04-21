import fs from "fs";
import path from "path";
import os from "os";
import net from "net";
import { startServer, type RunningServer } from "@diorama/cli";

const DIORAMA_HOME = path.join(os.homedir(), ".diorama");
const RUNTIME_PATH = path.join(DIORAMA_HOME, "runtime.json");

export interface RuntimeInfo {
  pid: number;
  port: number;
  startedAt: number;
}

export function getRuntimeInfo(): RuntimeInfo | null {
  try {
    if (!fs.existsSync(RUNTIME_PATH)) return null;
    const raw = fs.readFileSync(RUNTIME_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.pid === "number" &&
      typeof parsed?.port === "number" &&
      typeof parsed?.startedAt === "number"
    ) {
      return parsed as RuntimeInfo;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch /api/health to confirm an existing server is live.
 * Returns true if the server responds with ok=true within the timeout.
 */
async function probeHealth(port: number, timeoutMs = 500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://localhost:${port}/api/health`, {
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return body?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Find an available TCP port starting at `preferred`, falling back to OS-picked. */
async function findFreePort(preferred?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(preferred ?? 0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      server.close(() => resolve(port));
    });
  });
}

let ownedServer: RunningServer | null = null;

/**
 * Ensure a Diorama app server is running. Reuses an existing instance if one
 * is live (runtime.json + /api/health probe), otherwise spawns one in-process.
 * Returns the port and URL of the server.
 */
export async function ensureAppRunning(): Promise<{
  port: number;
  url: string;
  owned: boolean;
}> {
  // Reuse existing instance
  const existing = getRuntimeInfo();
  if (existing) {
    const alive = await probeHealth(existing.port);
    if (alive) {
      return {
        port: existing.port,
        url: `http://localhost:${existing.port}`,
        owned: false,
      };
    }
  }

  // Start a new in-process server
  const port = await findFreePort(3000);
  const server = await startServer({ headless: true, port });
  ownedServer = server;
  return { port: server.port, url: server.url, owned: true };
}

/** Close the owned server, if any. */
export async function shutdown(): Promise<void> {
  if (ownedServer) {
    await ownedServer.close();
    ownedServer = null;
  }
}
