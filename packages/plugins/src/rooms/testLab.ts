import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

interface TestTier {
  passed: number;
  failed: number;
  total: number;
}

export interface TestLabState {
  executionActive: boolean;
  pyramid: {
    unit: TestTier;
    integration: TestTier;
    e2e: TestTier;
  };
  screenshots: Array<{ url: string; testName: string; timestamp: number }>;
  browserStatus: "idle" | "running" | "passed" | "failed";
  currentUrl: string | null;
}

export function createTestLabState(): TestLabState {
  return {
    executionActive: false,
    pyramid: {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
    },
    screenshots: [],
    browserStatus: "idle",
    currentUrl: null,
  };
}

function hasFailed(state: TestLabState): boolean {
  const { unit, integration, e2e } = state.pyramid;
  return unit.failed > 0 || integration.failed > 0 || e2e.failed > 0;
}

function reduceTestLab(state: unknown, event: DioramaEvent): unknown {
  const s = state as TestLabState;

  switch (event.type) {
    case "aegis.sentinel.execution.started":
      return {
        ...s,
        executionActive: true,
        browserStatus: "running" as const,
        pyramid: {
          unit: { passed: 0, failed: 0, total: 0 },
          integration: { passed: 0, failed: 0, total: 0 },
          e2e: { passed: 0, failed: 0, total: 0 },
        },
        screenshots: [],
      };

    case "aegis.sentinel.test.passed": {
      const tier = (event.payload as { testType: string }).testType as keyof TestLabState["pyramid"];
      const current = s.pyramid[tier] ?? s.pyramid.unit;
      return {
        ...s,
        pyramid: {
          ...s.pyramid,
          [tier]: { passed: current.passed + 1, failed: current.failed, total: current.total + 1 },
        },
      };
    }

    case "aegis.sentinel.test.failed": {
      const tier = (event.payload as { testType: string }).testType as keyof TestLabState["pyramid"];
      const current = s.pyramid[tier] ?? s.pyramid.unit;
      return {
        ...s,
        pyramid: {
          ...s.pyramid,
          [tier]: { passed: current.passed, failed: current.failed + 1, total: current.total + 1 },
        },
      };
    }

    case "aegis.sentinel.execution.complete":
      return {
        ...s,
        executionActive: false,
        browserStatus: hasFailed(s) ? ("failed" as const) : ("passed" as const),
      };

    case "aegis.playwright.screenshot.captured": {
      const p = event.payload as { url: string; testName: string };
      return {
        ...s,
        screenshots: [...s.screenshots, { url: p.url, testName: p.testName, timestamp: event.timestamp }],
      };
    }

    default:
      return state;
  }
}

export const testLabPlugin: RoomPlugin = {
  kind: "room",
  type: "test-lab",
  defaultSize: [2, 3],
  reducer: reduceTestLab,
  catalog: { icon: "flask", description: "Test execution lab for Sentinel" },
};
