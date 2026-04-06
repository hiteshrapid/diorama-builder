import { z } from "zod";

const RoomSchema = z.object({
  preset: z.string(),
  position: z.tuple([z.number(), z.number()]),
  size: z.tuple([z.number(), z.number()]),
  label: z.string(),
});

const AgentAssignmentSchema = z.object({
  desk: z.string(),
  color: z.string().optional(),
});

const GatewaySchema = z.object({
  url: z.string(),
  token: z.string().optional(),
});

const DioramaConfigSchema = z.object({
  name: z.string(),
  gateway: GatewaySchema,
  view: z.string().default("3d-office"),
  theme: z.string().default("neon-dark"),
  rooms: z.array(RoomSchema).default([]),
  agents: z.record(z.string(), AgentAssignmentSchema).default({}),
});

export type DioramaConfig = z.infer<typeof DioramaConfigSchema>;
export type RoomConfig = z.infer<typeof RoomSchema>;
export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;

export class DioramaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DioramaConfigError";
  }
}

function resolveEnvVars(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.startsWith("$")) {
    const envName = value.slice(1);
    return process.env[envName] ?? "";
  }
  return value;
}

export function parseConfig(raw: unknown): DioramaConfig {
  const result = DioramaConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new DioramaConfigError(`Invalid config: ${messages}`);
  }
  const config = result.data;
  config.gateway.token = resolveEnvVars(config.gateway.token);
  return config;
}
