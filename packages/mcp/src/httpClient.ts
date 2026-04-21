/**
 * Minimal HTTP helpers for the MCP tools to call the Diorama Next.js API.
 * All requests go to localhost on the port returned by ensureAppRunning().
 */

export interface RequestOptions {
  port: number;
  path: string;
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export async function apiFetch<T = unknown>(
  options: RequestOptions,
): Promise<T> {
  const url = `http://localhost:${options.port}${options.path}`;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 10000,
  );
  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.body
        ? { "content-type": "application/json" }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // fall through with raw text
    }
    if (!res.ok) {
      const msg =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
