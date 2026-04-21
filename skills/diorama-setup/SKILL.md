---
name: diorama-setup
description: End-to-end setup for the Diorama 3D office plugin — launches the builder, scans the user's OpenClaw workspace, proposes events, writes emission calls into agent code, and opens the live view
---

# Diorama Setup

You are the orchestrator of the Diorama plugin. Your job: take the user from zero (no 3D office, no events wired) to a fully running live view of their OpenClaw agents animating in 3D — in one conversation.

**Do not skip steps.** Each step depends on the previous. If a step fails, stop and report — don't silently continue.

## Tools at your disposal

- **MCP tools** (prefixed `diorama_`):
  - `diorama_start({ route })` — spawn/ensure the Diorama app and open the browser to `/builder`, `/live`, or `/`
  - `diorama_open_wizard()` — shortcut for opening `/builder`
  - `diorama_get_config({ waitForSave })` — read `~/.diorama/config.json`; with `waitForSave: true` it long-polls (up to 10 min) until the user clicks Save & Continue
  - `diorama_add_room`, `diorama_set_theme`, `diorama_emit_event` — programmatic mutation
- **Claude Code tools**: Read, Edit, Write, Bash, Glob, Grep
- **Local Node modules** (via `require()` in `node -e` or a helper script):
  - `@diorama/setup` — exports `scanOpenClawWorkspace`, `proposeEvents`, `registerMcpInOpenClaw`, `writeSetupSession`, `readSetupSession`, `clearSetupSession`

## Checklist — do these in order

### 1. Announce and launch the builder

Say: "Opening the Diorama builder in your browser. Design your office — add rooms, furniture, and a theme, then click Save & Continue."

Call `diorama_start({ route: "/builder" })`. The tool returns once the browser is opened.

### 2. Wait for the user to save the office

Call `diorama_get_config({ waitForSave: true })`. This blocks for up to ~10 minutes while the user works in the browser. It returns the saved `DioramaConfig` JSON once they hit Save & Continue.

Parse the returned config. You now know `rooms[]`, `theme`, and `agents{}`.

If the call times out, tell the user you lost track of their save and re-call it. Do not proceed without a saved config.

### 3. Scan the user's OpenClaw workspace

Run (via `Bash`):

```bash
/opt/homebrew/opt/node@22/bin/node -e "
const { scanOpenClawWorkspace } = require('${CLAUDE_PLUGIN_ROOT}/packages/setup/dist/index.js');
const os = require('os');
console.log(JSON.stringify(scanOpenClawWorkspace(os.homedir()), null, 2));
"
```

Parse the output. You now have `{ agents, mcpServers, workspaceFiles, openClawConfigPath }`.

If OpenClaw isn't installed (scan fails or agents list is empty), tell the user: "I don't see an OpenClaw setup at `~/.openclaw/`. Do you want to skip OpenClaw integration for now? The builder is saved and you can return later."

### 4. Summarize what you found

Tell the user in plain language, e.g.:

> "I see 3 OpenClaw agents — **reviewer**, **advisor**, **broadcaster**. Their entry files look like `reviewer.js`, `advisor.ts`, `broadcaster.js` under `~/.openclaw/workspace/`. Before I propose events, walk me through a typical flow — what does each agent do, and what are the moments in their code you'd want to see animate in 3D?"

### 5. Interview the user

Accept free-form text. Ask one follow-up if you need clarity (e.g., "Which agent initiates work? Is there a handoff step?"). Don't interrogate — two questions max. Your goal is a rough flow narrative.

Write the transcript to `~/.diorama/setup-session.json` using `writeSetupSession` so you survive a context reset. (This is a nice-to-have, not a blocker.)

### 6. Propose events

Run:

```bash
/opt/homebrew/opt/node@22/bin/node -e "
const { scanOpenClawWorkspace, proposeEvents } = require('${CLAUDE_PLUGIN_ROOT}/packages/setup/dist/index.js');
const os = require('os');
const scan = scanOpenClawWorkspace(os.homedir());
const proposal = proposeEvents(scan, process.env.TRANSCRIPT || '');
console.log(JSON.stringify(proposal, null, 2));
" | TRANSCRIPT="$(cat <<'EOF'
<the interview transcript here>
EOF
)"
```

Then **read the actual source files** with the Read tool and refine the `line` numbers based on where interesting handler functions are. The proposer gives you a seed list; you do the final placement.

Present the list to the user as a table:

| Agent       | File                 | Line | Event type                   | Default visual |
|-------------|----------------------|------|------------------------------|----------------|
| reviewer    | reviewer.js          | 42   | `reviewer.ticket.approved`   | reviewing      |
| advisor     | advisor.ts           | 88   | `advisor.opinion.submitted`  | sending        |
| broadcaster | broadcaster.js       | 17   | `broadcaster.message.sent`   | talking        |

Ask: "Does this look right? Edit/add/remove any events before I write the code."

### 7. Persist the mappings

Once the user approves, POST the mappings to the Diorama config:

```bash
curl -sS -X POST "http://localhost:$(/opt/homebrew/opt/node@22/bin/node -e "console.log(JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.diorama/runtime.json')).port)")/api/config/mappings" \
  -H 'content-type: application/json' \
  -d '{"mappings":[<the approved list>]}'
```

### 8. Write the integration code

For each approved event, use the `Edit` tool to modify the user's agent file:

- **Ensure the import exists at the top of the file.** For ESM: `import { dioramaEmit } from "@diorama/client";`. For CJS: `const { dioramaEmit } = require("@diorama/client");`. Detect which by looking at existing imports — don't mix styles.
- **Insert the emit call at the proposed line.** The line is typically the last line of an interesting function body, before the return. Insert:
  ```javascript
  await dioramaEmit({ type: "<event.type>", room: "<room-label>", agent: "<agent-id>", payload: { /* anything contextual */ } });
  ```

Show each diff to the user before applying. Describe it in one line ("Inserting emit in reviewer.js at line 42 — approves the ticket").

### 9. Register the MCP in OpenClaw

```bash
/opt/homebrew/opt/node@22/bin/node -e "
const { registerMcpInOpenClaw } = require('${CLAUDE_PLUGIN_ROOT}/packages/setup/dist/index.js');
const os = require('os');
const result = registerMcpInOpenClaw(os.homedir(), 'diorama', {
  command: 'node',
  args: ['${CLAUDE_PLUGIN_ROOT}/packages/mcp/dist/bin.js'],
});
console.log(JSON.stringify(result));
"
```

If `changed` is true, tell the user their `~/.openclaw/openclaw.json` got a new `mcp.servers.diorama` entry. If false, note that the entry already matches — nothing to do.

### 10. Install the `@diorama/client` runtime package in the user's project

The user's agents need the `dioramaEmit()` helper. For MVP (not published to npm), install from the local plugin path:

```bash
cd "$(pwd)" && npm install "file:${CLAUDE_PLUGIN_ROOT}/packages/client"
```

If the user's project isn't a node package (no `package.json` in cwd), tell them: "Add `@diorama/client` to your agent project when you're ready. The plugin lives at `${CLAUDE_PLUGIN_ROOT}/packages/client`."

### 11. Launch the live view

Call `diorama_start({ route: "/live" })`. Tell the user:

> "Setup done. Your live view is open at the URL above. Start your OpenClaw agents — `cd ~/.openclaw && ./run` or however you usually start them — and watch them animate in 3D. Events fire the moment your code hits `dioramaEmit()`."

## Failure handling

- If an MCP tool times out: retry once, then report to the user.
- If a file edit fails because the line number shifted (someone else edited the file mid-flow): re-read the file, re-propose the line, ask the user to re-confirm.
- Never silently skip a step. Never pretend a step succeeded when it failed.
- If OpenClaw integration fails mid-way (e.g., agent file is Python, scanner errors), stop at that step, tell the user what broke, and offer to finish the remaining non-code steps (live view, MCP registration) separately.

## What not to do

- Don't invent agents that aren't in the scan.
- Don't propose events for file paths you haven't read.
- Don't write emit calls with `type` strings that weren't in the approved list.
- Don't skip the diff review — always show the user what you're about to change.
- Don't assume the user is in their OpenClaw directory; always use absolute paths via `os.homedir()`.
