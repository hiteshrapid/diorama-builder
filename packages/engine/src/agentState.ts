const WALK_SPEED = 2.5;
const WAYPOINT_THRESHOLD = 0.08;

export type AgentMode = "idle" | "walking" | "seated";

export interface AgentState {
  x: number;
  z: number;
  facing: number;
  mode: AgentMode;
  path: [number, number, number][];
  waypointIndex: number;
  seatRotation: number | null;
}

export type AgentAction =
  | { type: "SET_PATH"; path: [number, number, number][] }
  | { type: "TICK"; delta: number }
  | { type: "SIT"; seatRotation: number }
  | { type: "STAND" };

export function createAgentState(opts: {
  x: number;
  z: number;
  seatRotation?: number;
}): AgentState {
  return {
    x: opts.x,
    z: opts.z,
    facing: 0,
    mode: "idle",
    path: [],
    waypointIndex: 0,
    seatRotation: opts.seatRotation ?? null,
  };
}

export function updateAgentState(
  state: AgentState,
  action: AgentAction
): AgentState {
  switch (action.type) {
    case "SET_PATH":
      return {
        ...state,
        mode: "walking",
        path: action.path,
        waypointIndex: 0,
      };

    case "TICK": {
      if (state.mode !== "walking" || state.path.length === 0) return state;

      const target = state.path[state.waypointIndex];
      const dx = target[0] - state.x;
      const dz = target[2] - state.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < WAYPOINT_THRESHOLD) {
        // Reached waypoint
        if (state.waypointIndex < state.path.length - 1) {
          return {
            ...state,
            x: target[0],
            z: target[2],
            waypointIndex: state.waypointIndex + 1,
          };
        }
        // Final waypoint — go idle
        return {
          ...state,
          x: target[0],
          z: target[2],
          mode: "idle",
          path: [],
          waypointIndex: 0,
        };
      }

      // Move toward waypoint
      const step = Math.min(WALK_SPEED * action.delta, dist);
      const nx = state.x + (dx / dist) * step;
      const nz = state.z + (dz / dist) * step;
      const facing = Math.atan2(dx, dz);

      return { ...state, x: nx, z: nz, facing };
    }

    case "SIT":
      return {
        ...state,
        mode: "seated",
        seatRotation: action.seatRotation,
      };

    case "STAND":
      return {
        ...state,
        mode: "idle",
        seatRotation: null,
      };

    default:
      return state;
  }
}

export interface IdlePose {
  leftArmX: number;
  rightArmX: number;
  headY: number;
  torsoLean: number;
  bodySwayX: number;
  bodySwayZ: number;
  chairTurn: number;
}

export function computeIdlePose(t: number, phase: number): IdlePose {
  const pt = t + phase;
  const cycle = pt % 20;

  // Gentle constant sway
  const bodySwayX = Math.sin(pt * 0.4) * 0.012;
  const bodySwayZ = Math.cos(pt * 0.35 + 1) * 0.008;

  let leftArmX = 0;
  let rightArmX = 0;
  let headY = 0;
  let torsoLean = 0;
  let chairTurn = 0;

  if (cycle < 4) {
    // Turn in chair, look around
    chairTurn = Math.sin(cycle * 0.8) * 0.3;
    headY = Math.sin(cycle * 1.2) * 0.15;
  } else if (cycle < 6.5) {
    // Stretch — lean back, arms up
    const p = (cycle - 4) / 2.5;
    torsoLean = -0.15 * Math.sin(p * Math.PI);
    leftArmX = -0.8 * Math.sin(p * Math.PI);
    rightArmX = -0.8 * Math.sin(p * Math.PI);
  } else if (cycle < 9) {
    // Type — lean forward
    const p = (cycle - 6.5) / 2.5;
    torsoLean = 0.1 * Math.sin(p * Math.PI);
    leftArmX = -0.6 + Math.sin(pt * 4) * 0.08;
    rightArmX = -0.6 + Math.cos(pt * 4) * 0.08;
  } else if (cycle < 12) {
    // Check phone — right arm up, chair turn right
    const p = (cycle - 9) / 3;
    rightArmX = -0.5 * Math.sin(p * Math.PI);
    chairTurn = -0.2 * Math.sin(p * Math.PI);
  } else if (cycle < 15) {
    // Talk to neighbor — chair turn left, gesticulate
    const p = (cycle - 12) / 3;
    chairTurn = 0.25 * Math.sin(p * Math.PI);
    leftArmX = -0.3 * Math.sin(pt * 3);
    rightArmX = -0.2 * Math.cos(pt * 2.5);
  } else if (cycle < 17.5) {
    // Coffee sip
    const p = (cycle - 15) / 2.5;
    leftArmX = -0.7 * Math.sin(p * Math.PI);
    headY = -0.08 * Math.sin(p * Math.PI);
  } else {
    // Fidget — weight shift
    const p = (cycle - 17.5) / 2.5;
    chairTurn = Math.sin(p * Math.PI * 2) * 0.1;
  }

  return { leftArmX, rightArmX, headY, torsoLean, bodySwayX, bodySwayZ, chairTurn };
}
