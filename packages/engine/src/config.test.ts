import { describe, it, expect } from "vitest";
import { parseConfig, DioramaConfigError } from "./config";

describe("parseConfig", () => {
  const validConfig = {
    name: "Test Office",
    gateway: { url: "ws://localhost:4040" },
    view: "3d-office",
    theme: "neon-dark",
    rooms: [
      {
        preset: "meeting",
        position: [0, 0],
        size: [3, 3],
        label: "Strategy Room",
      },
    ],
    agents: {},
  };

  it("accepts a valid minimal config", () => {
    const result = parseConfig(validConfig);
    expect(result.name).toBe("Test Office");
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].preset).toBe("meeting");
  });

  it("rejects config missing required 'name' field", () => {
    const { name, ...noName } = validConfig;
    expect(() => parseConfig(noName)).toThrow(DioramaConfigError);
  });

  it("rejects config missing required 'gateway' field", () => {
    const { gateway, ...noGateway } = validConfig;
    expect(() => parseConfig(noGateway)).toThrow(DioramaConfigError);
  });

  it("rejects config with invalid room missing 'preset'", () => {
    const config = {
      ...validConfig,
      rooms: [{ position: [0, 0], size: [2, 2], label: "Bad Room" }],
    };
    expect(() => parseConfig(config)).toThrow(DioramaConfigError);
  });

  it("rejects config with invalid room position (non-array)", () => {
    const config = {
      ...validConfig,
      rooms: [{ preset: "workspace", position: "bad", size: [2, 2], label: "X" }],
    };
    expect(() => parseConfig(config)).toThrow(DioramaConfigError);
  });

  it("defaults view to '3d-office' when omitted", () => {
    const { view, ...noView } = validConfig;
    const result = parseConfig(noView);
    expect(result.view).toBe("3d-office");
  });

  it("defaults theme to 'neon-dark' when omitted", () => {
    const { theme, ...noTheme } = validConfig;
    const result = parseConfig(noTheme);
    expect(result.theme).toBe("neon-dark");
  });

  it("defaults agents to empty object when omitted", () => {
    const { agents, ...noAgents } = validConfig;
    const result = parseConfig(noAgents);
    expect(result.agents).toEqual({});
  });

  it("preserves agent assignments", () => {
    const config = {
      ...validConfig,
      agents: {
        "aegis-prime": { desk: "desk-1", color: "#6366f1" },
      },
    };
    const result = parseConfig(config);
    expect(result.agents["aegis-prime"].desk).toBe("desk-1");
    expect(result.agents["aegis-prime"].color).toBe("#6366f1");
  });

  it("resolves environment variables in gateway token", () => {
    process.env.TEST_DIORAMA_TOKEN = "secret-123";
    const config = {
      ...validConfig,
      gateway: { url: "ws://localhost:4040", token: "$TEST_DIORAMA_TOKEN" },
    };
    const result = parseConfig(config);
    expect(result.gateway.token).toBe("secret-123");
    delete process.env.TEST_DIORAMA_TOKEN;
  });

  it("leaves non-env-var tokens as-is", () => {
    const config = {
      ...validConfig,
      gateway: { url: "ws://localhost:4040", token: "literal-token" },
    };
    const result = parseConfig(config);
    expect(result.gateway.token).toBe("literal-token");
  });

  it("sets unresolvable env var to empty string", () => {
    delete process.env.NONEXISTENT_VAR;
    const config = {
      ...validConfig,
      gateway: { url: "ws://localhost:4040", token: "$NONEXISTENT_VAR" },
    };
    const result = parseConfig(config);
    expect(result.gateway.token).toBe("");
  });

  it("accepts multiple rooms", () => {
    const config = {
      ...validConfig,
      rooms: [
        { preset: "meeting", position: [0, 0], size: [3, 3], label: "A" },
        { preset: "lab", position: [3, 0], size: [2, 3], label: "B" },
        { preset: "workspace", position: [0, 3], size: [5, 2], label: "C" },
      ],
    };
    const result = parseConfig(config);
    expect(result.rooms).toHaveLength(3);
  });
});
