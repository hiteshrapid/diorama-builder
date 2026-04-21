import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dioramaEmit } from "./index";

describe("dioramaEmit", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DIORAMA_URL;
  });

  it("POSTs JSON to default URL", async () => {
    await dioramaEmit({ type: "test", room: "a", agent: "x" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/events/emit");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "content-type": "application/json" });
  });

  it("includes type, room, agent, and timestamp in body", async () => {
    const before = Date.now();
    await dioramaEmit({ type: "foo.bar", room: "R&D", agent: "a1" });
    const after = Date.now();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.type).toBe("foo.bar");
    expect(body.room).toBe("R&D");
    expect(body.agent).toBe("a1");
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });

  it("includes payload when provided", async () => {
    await dioramaEmit({
      type: "t",
      room: "r",
      agent: "a",
      payload: { foo: 42, bar: "hi" },
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.payload).toEqual({ foo: 42, bar: "hi" });
  });

  it("uses DIORAMA_URL env var when set", async () => {
    process.env.DIORAMA_URL = "http://example.com:9999/emit";
    await dioramaEmit({ type: "t", room: "r", agent: "a" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://example.com:9999/emit");
  });

  it("options.url overrides env var", async () => {
    process.env.DIORAMA_URL = "http://env-url";
    await dioramaEmit({ type: "t", room: "r", agent: "a" }, { url: "http://override" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://override");
  });

  it("swallows network errors (fire-and-forget)", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(
      dioramaEmit({ type: "t", room: "r", agent: "a" }),
    ).resolves.toBeUndefined();
  });

  it("swallows abort/timeout errors", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("abort"), { name: "AbortError" }));
    await expect(
      dioramaEmit({ type: "t", room: "r", agent: "a" }, { timeoutMs: 1 }),
    ).resolves.toBeUndefined();
  });

  it("passes an AbortSignal to fetch", async () => {
    await dioramaEmit({ type: "t", room: "r", agent: "a" });
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });
});
