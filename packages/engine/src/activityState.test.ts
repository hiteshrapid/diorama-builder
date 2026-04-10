import { describe, it, expect } from "vitest";
import {
  deriveActivity,
  formatEventLabel,
  ACTIVITY_TIMEOUT_MS,
  type AgentActivity,
} from "./activityState";

describe("activityState", () => {
  describe("deriveActivity — event type patterns", () => {
    const cases: Array<[string, string, AgentActivity]> = [
      // Testing
      ["aegis.sentinel.test.passed", "lab", "testing"],
      ["aegis.sentinel.execution.started", "lab", "testing"],
      ["aegis.sentinel.execution.complete", "lab", "testing"],
      // Reviewing
      ["aegis.intake.review.started", "meeting", "reviewing"],
      ["aegis.intake.ticket.approved", "meeting", "reviewing"],
      // Presenting
      ["aegis.executor.synthesis.started", "meeting", "presenting"],
      ["aegis.scenario.document.generated", "meeting", "presenting"],
      // Sending
      ["aegis.herald.message.sent", "workspace", "sending"],
      ["aegis.verdict.issued", "workspace", "sending"],
      // Talking
      ["aegis.advisor.output.ready", "meeting", "talking"],
      ["aegis.council.session.started", "meeting", "talking"],
      // Listening
      ["aegis.advisor.spawned", "meeting", "listening"],
      // Working
      ["aegis.scribe.pattern.promoted", "workspace", "working"],
    ];

    for (const [eventType, preset, expected] of cases) {
      it(`"${eventType}" → ${expected}`, () => {
        expect(deriveActivity(eventType, preset)).toBe(expected);
      });
    }
  });

  describe("deriveActivity — room preset fallback", () => {
    it("meeting room → talking", () => {
      expect(deriveActivity("some.unknown.event", "meeting")).toBe("talking");
    });

    it("lab → testing", () => {
      expect(deriveActivity("some.unknown.event", "lab")).toBe("testing");
    });

    it("social → talking", () => {
      expect(deriveActivity("some.unknown.event", "social")).toBe("talking");
    });

    it("workspace → working", () => {
      expect(deriveActivity("some.unknown.event", "workspace")).toBe("working");
    });

    it("private → working", () => {
      expect(deriveActivity("some.unknown.event", "private")).toBe("working");
    });

    it("unknown preset → working (default)", () => {
      expect(deriveActivity("some.unknown.event", "custom")).toBe("working");
    });
  });

  describe("deriveActivity — event type takes priority over preset", () => {
    it("test event in meeting room → testing (not talking)", () => {
      expect(deriveActivity("aegis.sentinel.test.passed", "meeting")).toBe("testing");
    });

    it("review event in lab → reviewing (not testing)", () => {
      expect(deriveActivity("aegis.intake.review.started", "lab")).toBe("reviewing");
    });
  });

  describe("formatEventLabel", () => {
    it("produces readable label for review event", () => {
      const label = formatEventLabel(
        "aegis.intake.review.started",
        "aegis-prime",
        "reception",
      );
      expect(label).toBe("Aegis Prime reviewing in Reception");
    });

    it("produces readable label for test event", () => {
      const label = formatEventLabel(
        "aegis.sentinel.test.passed",
        "sentinel",
        "test-lab",
        "lab",
      );
      expect(label).toBe("Sentinel running tests in Test Lab");
    });

    it("produces readable label for council event", () => {
      const label = formatEventLabel(
        "aegis.council.session.started",
        "aegis-prime",
        "council-chamber",
        "meeting",
      );
      expect(label).toBe("Aegis Prime discussing in Council Chamber");
    });

    it("produces readable label for herald event", () => {
      const label = formatEventLabel(
        "aegis.herald.message.sent",
        "herald",
        "comms-hub",
      );
      expect(label).toBe("Herald sending message in Comms Hub");
    });
  });

  describe("ACTIVITY_TIMEOUT_MS", () => {
    it("is a positive number", () => {
      expect(ACTIVITY_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it("is 8 seconds", () => {
      expect(ACTIVITY_TIMEOUT_MS).toBe(8000);
    });
  });
});
