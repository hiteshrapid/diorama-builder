import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  writeSetupSession,
  readSetupSession,
  clearSetupSession,
} from "./session";

describe("setup session", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-session-"));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("returns null when no session file exists", () => {
    expect(readSetupSession(tmpHome)).toBeNull();
  });

  it("round-trips a session", () => {
    writeSetupSession(tmpHome, {
      startedAt: 1000,
      transcript: "hello",
      step: "proposing",
    });
    const loaded = readSetupSession(tmpHome);
    expect(loaded?.transcript).toBe("hello");
    expect(loaded?.step).toBe("proposing");
  });

  it("creates ~/.diorama if missing", () => {
    writeSetupSession(tmpHome, { startedAt: 0 });
    expect(fs.existsSync(path.join(tmpHome, ".diorama"))).toBe(true);
  });

  it("clearSetupSession removes the file", () => {
    writeSetupSession(tmpHome, { startedAt: 0 });
    clearSetupSession(tmpHome);
    expect(readSetupSession(tmpHome)).toBeNull();
  });

  it("clearSetupSession tolerates missing file", () => {
    expect(() => clearSetupSession(tmpHome)).not.toThrow();
  });
});
