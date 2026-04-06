import crypto from "crypto";

let reqCounter = 0;

export interface DeviceIdentity {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  deviceId: string;
}

export async function generateDeviceIdentity(): Promise<DeviceIdentity> {
  const { publicKey: pubKeyObj, privateKey: privKeyObj } = crypto.generateKeyPairSync("ed25519");
  const publicKey = new Uint8Array(pubKeyObj.export({ type: "spki", format: "der" }).slice(-32));
  const privateKey = new Uint8Array(privKeyObj.export({ type: "pkcs8", format: "der" }).slice(-32));
  const deviceId = crypto.createHash("sha256").update(publicKey).digest("hex");
  return { privateKey, publicKey, deviceId };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function ed25519Sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const keyObj = crypto.createPrivateKey({
    key: Buffer.concat([
      // Ed25519 PKCS8 DER prefix
      Buffer.from("302e020100300506032b657004220420", "hex"),
      Buffer.from(privateKey),
    ]),
    format: "der",
    type: "pkcs8",
  });
  return new Uint8Array(crypto.sign(null, Buffer.from(message), keyObj));
}

export interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string; retryable?: boolean };
}

export interface EventFrame {
  type: "event";
  event: string;
  payload: Record<string, unknown>;
  seq?: number;
  stateVersion?: { presence: number; health: number };
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

export function serializeFrame(frame: GatewayFrame): string {
  return JSON.stringify(frame);
}

export function parseFrame(raw: string): GatewayFrame {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON frame: ${raw.slice(0, 100)}`);
  }

  if (!data.type || typeof data.type !== "string") {
    throw new Error(`Frame missing 'type' field`);
  }

  return data as unknown as GatewayFrame;
}

export function isEventFrame(frame: GatewayFrame): frame is EventFrame {
  return frame.type === "event";
}

export function isResponseFrame(frame: GatewayFrame): frame is ResponseFrame {
  return frame.type === "res";
}

export async function createConnectRequest(opts: {
  token: string;
  nonce: string;
  device?: DeviceIdentity;
}): Promise<RequestFrame> {
  const scopes = ["operator.admin", "operator.approvals", "operator.pairing"];
  const signedAt = Date.now();
  const params: Record<string, unknown> = {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: "openclaw-control-ui",
      version: "0.1.0",
      platform: "web",
      mode: "webchat",
    },
    role: "operator",
    scopes,
    auth: { token: opts.token },
    caps: [],
  };

  if (opts.device) {
    const payload = `v2|${opts.device.deviceId}|openclaw-control-ui|webchat|operator|${scopes.join(",")}|${signedAt}|${opts.token}|${opts.nonce}`;
    const msgBytes = new TextEncoder().encode(payload);
    const signature = ed25519Sign(msgBytes, opts.device.privateKey);

    params.device = {
      id: opts.device.deviceId,
      publicKey: bytesToBase64Url(opts.device.publicKey),
      signature: bytesToBase64Url(signature),
      signedAt,
      nonce: opts.nonce,
    };
  }

  return {
    type: "req",
    id: `diorama-${Date.now()}-${++reqCounter}`,
    method: "connect",
    params,
  };
}
