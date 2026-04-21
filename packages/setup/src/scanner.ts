import fs from "fs";
import path from "path";

export interface ScanResult {
  openClawConfigPath: string;
  agents: string[];
  mcpServers: string[];
  workspaceFiles: string[];
  openClawConfig: Record<string, unknown> | null;
}

/**
 * Read ~/.openclaw/ to produce a summary useful for the setup skill.
 * Silently tolerates missing files — callers handle empty results.
 */
export function scanOpenClawWorkspace(homeDir: string): ScanResult {
  const openClawDir = path.join(homeDir, ".openclaw");
  const configPath = path.join(openClawDir, "openclaw.json");
  const workspaceDir = path.join(openClawDir, "workspace");
  const agentsDir = path.join(openClawDir, "agents");

  const result: ScanResult = {
    openClawConfigPath: configPath,
    agents: [],
    mcpServers: [],
    workspaceFiles: [],
    openClawConfig: null,
  };

  // Load openclaw.json
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        result.openClawConfig = parsed;
        const agents = parsed.agents;
        if (agents && typeof agents === "object") {
          result.agents = Object.keys(agents);
        }
        const mcp = parsed.mcp;
        if (mcp && typeof mcp === "object" && mcp.servers && typeof mcp.servers === "object") {
          result.mcpServers = Object.keys(mcp.servers);
        }
      }
    } catch {
      // ignore unparseable config
    }
  }

  // Fall back to agent directory names
  if (result.agents.length === 0 && fs.existsSync(agentsDir)) {
    try {
      result.agents = fs
        .readdirSync(agentsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      // ignore
    }
  }

  // List top-level workspace markdown files (DISPATCH.md, AGENTS.md, etc.)
  if (fs.existsSync(workspaceDir)) {
    try {
      result.workspaceFiles = fs
        .readdirSync(workspaceDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.join(workspaceDir, entry.name));
    } catch {
      // ignore
    }
  }

  return result;
}
