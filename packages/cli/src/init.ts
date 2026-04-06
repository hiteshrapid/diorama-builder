import fs from "fs";
import path from "path";

export interface ScaffoldOptions {
  name: string;
  dir: string;
  template: "starter" | "full-office" | "minimal";
}

const TEMPLATES: Record<string, object> = {
  starter: {
    view: "3d-office",
    theme: "neon-dark",
    rooms: [
      { type: "council-chamber", position: [0, 0], size: [3, 3], label: "Strategy Room" },
      { type: "test-lab", position: [3, 0], size: [2, 3], label: "QA Lab" },
      { type: "bullpen", position: [0, 3], size: [5, 2], label: "Agent Floor" },
    ],
  },
  "full-office": {
    view: "3d-office",
    theme: "neon-dark",
    rooms: [
      { type: "archive", position: [0, 0], size: [4, 2], label: "Knowledge Garden" },
      { type: "comms-hub", position: [4, 0], size: [2, 2], label: "Comms Hub" },
      { type: "bullpen", position: [0, 2], size: [4, 2], label: "Agent Bullpen" },
      { type: "breakroom", position: [4, 2], size: [2, 2], label: "Breakroom" },
      { type: "reception", position: [0, 4], size: [2, 3], label: "Reception" },
      { type: "council-chamber", position: [2, 4], size: [2, 3], label: "Council Chamber" },
      { type: "test-lab", position: [4, 4], size: [2, 3], label: "Test Lab" },
    ],
  },
  minimal: {
    view: "dashboard",
    theme: "minimal",
    rooms: [
      { type: "bullpen", position: [0, 0], size: [4, 3], label: "Agent Floor" },
    ],
  },
};

export function scaffoldProject(opts: ScaffoldOptions): void {
  const { name, dir, template } = opts;

  // Check if dir exists and is non-empty
  if (fs.existsSync(dir)) {
    const contents = fs.readdirSync(dir);
    if (contents.length > 0) {
      throw new Error(`Directory "${dir}" is not empty`);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }

  const templateConfig = TEMPLATES[template] ?? TEMPLATES.starter;

  // package.json
  const pkg = {
    name,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "diorama dev",
      build: "diorama build",
    },
    dependencies: {
      "@diorama/engine": "^0.1.0",
      "@diorama/plugins": "^0.1.0",
      "@diorama/cli": "^0.1.0",
      "@diorama/ui": "^0.1.0",
    },
  };
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2));

  // diorama.config.json
  const config = {
    name,
    gateway: { url: "ws://localhost:4040", token: "$OPENCLAW_TOKEN" },
    ...templateConfig,
    agents: {},
  };
  fs.writeFileSync(path.join(dir, "diorama.config.json"), JSON.stringify(config, null, 2));

  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
  };
  fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
}
