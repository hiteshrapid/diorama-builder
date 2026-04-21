import fs from "fs";
import path from "path";

export interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface RegisterMcpResult {
  path: string;
  changed: boolean;
  previous: McpServerEntry | null;
}

/**
 * Read-merge-write ~/.openclaw/openclaw.json to register a diorama MCP server.
 * Idempotent: if the entry already matches exactly, returns changed=false.
 * Creates mcp.servers if missing.
 */
export function registerMcpInOpenClaw(
  homeDir: string,
  name: string,
  entry: McpServerEntry,
): RegisterMcpResult {
  const configPath = path.join(homeDir, ".openclaw", "openclaw.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`OpenClaw config not found at ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw);

  if (!config || typeof config !== "object") {
    throw new Error(`OpenClaw config at ${configPath} is not a JSON object`);
  }

  config.mcp = config.mcp && typeof config.mcp === "object" ? config.mcp : {};
  const mcp = config.mcp as Record<string, unknown>;
  mcp.servers =
    mcp.servers && typeof mcp.servers === "object" ? mcp.servers : {};
  const servers = mcp.servers as Record<string, unknown>;

  const previous =
    servers[name] && typeof servers[name] === "object"
      ? (servers[name] as McpServerEntry)
      : null;

  if (previous && shallowEqualServerEntry(previous, entry)) {
    return { path: configPath, changed: false, previous };
  }

  servers[name] = entry;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return { path: configPath, changed: true, previous };
}

function shallowEqualServerEntry(
  a: McpServerEntry,
  b: McpServerEntry,
): boolean {
  if (a.command !== b.command) return false;
  if (a.args.length !== b.args.length) return false;
  for (let i = 0; i < a.args.length; i++) {
    if (a.args[i] !== b.args[i]) return false;
  }
  const aEnvKeys = Object.keys(a.env ?? {}).sort();
  const bEnvKeys = Object.keys(b.env ?? {}).sort();
  if (aEnvKeys.length !== bEnvKeys.length) return false;
  for (let i = 0; i < aEnvKeys.length; i++) {
    if (aEnvKeys[i] !== bEnvKeys[i]) return false;
    if (a.env?.[aEnvKeys[i]] !== b.env?.[bEnvKeys[i]]) return false;
  }
  return true;
}
