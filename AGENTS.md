# Project instructions and architecture

## Purpose
Pip is a local autonomous 3D bird. Preserve beginner-friendly startup, demo mode without an API key, the bird’s freedom to invent actions, and strict confinement of all AI file capabilities.

## Files
- `start.js`: switches to project directory, creates `.env` from `.env.example` without overwriting existing secrets, imports server.
- `server.js`: Express HTTP and Socket.io server; validates configuration; owns one serial brain loop and pause state; persists mind/memories; invokes OpenAI JSON mode and validates output; reflects every tenth cycle.
- `brain.js`: initial mind, deterministic demo sequence and runtime validation for decisions/reflection.
- `workspace.js`: the only AI creation filesystem boundary. Flat allowlisted filenames; SVG/HTML/TXT/JSON only, max 150 KB; no traversal, absolute paths, Windows device names, ADS or symlink targets. Writes use exclusive temporary files and atomic rename. Never accept AI-provided filesystem paths elsewhere.
- `public/index.html`, `style.css`, `app.js`: responsive room UI, procedural Three.js geometry, interpolated movement, real-time stats, connection state, controls, gallery and sandboxed previews. Three.js is served locally from the installed package; Socket.io serves its own client.
- `data/mind.json`: core_traits, current_obsession, active_project, worldview. `data/memories.json`: latest 300 completed experiences. Runtime data is private and Git-ignored.
- `bird_creations/`: persistent creative output, Git-ignored except `.gitkeep`. Demo seeds a drawing and note only when absent.
- `test/`: dependency-free Node test runner; workspace tests can run before installing dependencies; server test needs all npm dependencies.

## Runtime contracts
State is broadcast on Socket.io `state`; client sends `brain:pause` boolean; server emits `creations:changed` after writes. HTTP GET `/api/health`, `/api/state`, `/api/creations`, `/api/creations/:name`. File contents are returned as JSON, never directly served as same-origin HTML or SVG. `/vendor/three.module.js` serves Three.js; `/socket.io/socket.io.js` serves the Socket.io client.

`/api/preview/:name` renders HTML/SVG under a response-header CSP with `sandbox allow-scripts`, no network and an opaque origin. The iframe also uses `sandbox="allow-scripts"`. Use this dedicated route instead of blob previews, which inherit the parent CSP and break inline scripts. Never add allow-same-origin. `companion:message` accepts a string up to 1200 characters, one per second per connection, with acknowledgements. `companion:request` accepts `{id,status:granted|declined}` for pending requests. `conversation` broadcasts the persisted latest 100 messages/requests. `/api/conversation` and `/api/memories` expose bounded history; `memories` broadcasts completed thoughts. Requests never expand filesystem or system capabilities.

Brain decision: `{thought, action_label, target, create_or_edit_file:null|{filename,content}, question_for_you:null|string, request_for_you:null|string, message_for_you:null|string}`. Conversation fields are at most 600 characters; let Pip choose when to use them. Recent conversations and request statuses enter cycle and reflection context. Target is bed/bowl/desk/window/random_spot. File writes require desk target. Free-form action labels must not be converted into a fixed action enum. Stats are simulated body telemetry. Hunger=100 means very hungry. Rendering never drives AI state. Deep reflection returns a complete validated mind object, saved atomically. Demo intentionally does not pretend to generate personalised replies.

Schedule the next cycle only after the current cycle completes (default 30-second gap). Never use overlapping setInterval calls for AI requests. Pausing clears the timer, discards pending model responses and prevents deferred file writes; it cannot revoke a request already sent to OpenAI. Resume schedules the next cycle. Errors are logged, shown without secrets, and retried after the normal interval.

## Security invariants
Keep API keys exclusively on the server. Never commit `.env`, node_modules, memories or user creations. Generated HTML/SVG is untrusted. Preview only in an iframe with `sandbox="allow-scripts"` and no allow-same-origin; apply an inner CSP denying external resources, connections, frames, objects, forms and base URLs. Never insert generated markup into the app DOM or evaluate it in the server. Downloads are explicit user actions. Do not add AI shell/system tools. Protect filename boundaries and test invalid paths before expanding file capabilities. This sandbox limits AI capabilities; it does not defend against another local process with filesystem write privileges racing file operations. Keep the server loopback-only until authentication is implemented.

## Development and verification
Node >=22. `npm install`; `npm run check`; `npm test`; `npm start`. Default http://localhost:3000. For quick manual checks use CYCLE_SECONDS=5 in local `.env` and restore 30 afterward. Confirm movement, pause/resume, gallery refresh, sandboxed HTML interaction and desktop/mobile layouts. Live OpenAI testing requires the user’s API key and billing; never fabricate success when only demo mode was tested. Avoid adding external CDN/font dependencies.
