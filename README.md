# Pip — a little life of its own

A cosy 3D virtual bird that wanders, wonders, rests, eats and makes things. Built with Node.js, Express, Socket.io, Three.js and the official OpenAI SDK. Demo mode works without an API key. There is no build step and no external CDN is needed after installation.

## Start on Windows

1. Install **Node.js LTS (22 or later)** from https://nodejs.org. Include npm when installing. Reopen your terminal afterward.
2. Download this repository using GitHub’s **Code → Download ZIP**, then extract the ZIP.
3. Open the extracted folder and double-click **Start-Pip.cmd**. It installs dependencies on the first run, prepares a demo `.env` if absent, and starts Pip. Leave that window open.
4. Open **http://localhost:3000** in your browser. Pip’s first drawing and note are immediately available under **Gallery / Desk**.

Alternatively, open a terminal in the project folder and run:

```powershell
npm install
npm start
```

Stop the app with **Ctrl+C** in its terminal. It runs while the server is open, even when you close the browser. Closing the server stops its brain. Pause / Resume Brain affects all tabs viewing the same bird.

## Free local AI — no API key

1. Stop the running Pip server with **Ctrl+C**.
2. Double-click **Setup-Local-AI.cmd** in the updated project folder.
3. Leave the setup window open while it downloads the official Ollama runtime (if needed) and the approximately **1.9 GB qwen2.5:3b** model. It selects a native Windows ARM64 or x64 runtime and verifies the release archive’s SHA-256 digest. No account or API key is used.
4. Setup starts Ollama, tests a real model response, then changes the local `.env` to `AI_PROVIDER=ollama` and `DEMO_MODE=false`. Existing keys, port settings, memories and creations are preserved. If setup fails, the `.env` is not switched.
5. Run **Start-Pip.cmd** again, refresh localhost, and look for **LOCAL AI** in the footer. Send Pip a message; it will consider it in its next cycle.

The model makes its own choices, questions, requests, projects and reflections, just as in OpenAI mode. A small local model can be slower and less capable than a hosted model, especially for complex HTML games. On a 16 GB Snapdragon PC, start with the supplied 3B model; actual speed depends on available memory and CPU/GPU support. The 30-second cycle is a gap after a completed decision, not a promise of one reply every 30 seconds. Model generation can take longer, especially on the first request.

Portable Ollama, model files and logs stay in the Git-ignored `.local-ai/` folder. If Ollama is already installed, setup reuses it and its existing model directory. Normal startup automatically starts Ollama if needed; it remains as a background service after you close Pip and unloads the model after five minutes without requests. Downloads need internet, but downloaded local models do not need API access. Local mode never falls back to OpenAI or a cloud model. You still use your own hardware and electricity.

Manual alternative: install Ollama from https://ollama.com/download/windows, run `ollama pull qwen2.5:3b`, then set:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
AI_TIMEOUT_SECONDS=300
DEMO_MODE=false
```

To use a different downloaded local model, change `OLLAMA_MODEL` and restart Pip. Cloud model names and non-loopback Ollama endpoints are rejected. If using an existing Ollama installation, keep its service available on port 11434.

## Give Pip an OpenAI brain

1. Stop the server.
2. Open the local `.env` file with Notepad. Startup creates it automatically from `.env.example` if it is missing. Do not share or commit it.
3. Add your own OpenAI API key and switch demo mode off:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
AI_PROVIDER=openai
DEMO_MODE=false
CYCLE_SECONDS=30
PORT=3000
```

4. Save and run `npm start` again. OpenAI API usage requires API billing, separately from a ChatGPT subscription. Each cycle makes one request; every tenth completed cycle adds a reflection request. Pause the brain or stop the server to stop new requests. A request already submitted when you pause may still incur its API charge; its result is discarded.

Pip chooses its own action label and movement target. Its interests are stored in `data/mind.json` and its latest 300 memories in `data/memories.json`. Every 10 cycles it reviews recent experiences and chooses whether to continue or change its obsession and project. Body stats reflect activities, but do not dictate the AI’s choices. In demo mode a six-scene sequence demonstrates movement and file creation; it is deliberately simulated, not AI-generated.

## Explore the collection

Click **Gallery / Desk**, then a filename. SVG drawings and HTML toys open in a sandboxed preview. TXT and JSON files show as text. Use **View source** to inspect any file and **Download** to save a copy. Changes appear live while the gallery is open. Desk sparkles indicate active creative work.

Pip can create or replace a complete `.svg`, `.html`, `.txt` or `.json` file in `bird_creations/`. It receives the latest three files as context so it can develop earlier work. It cannot run shell commands, install packages, browse the web, or edit application files. HTML toys must be self-contained: external scripts and network access are blocked. Downloads should be treated as generated content; preview them in the gallery before opening elsewhere.

## Talk with Pip

Below the room, **A little conversation** lets you answer Pip’s questions or share ideas. It reads your messages on its next cycle, chooses how to reply, and may independently ask new questions. **Pip’s requests** lets you grant or decline requests. A grant records your agreement; it never gives Pip additional computer or account permissions. If it requests a colour, idea or observation, share that in a message. You can read its latest 30 thoughts in the **thought journal**. Conversation and request history persists in `data/conversations.json` (latest 100 entries). Suggestions can influence Pip; the model chooses whether to follow them. These are generated in-character thoughts, not consciousness.

Demo mode demonstrates a question on cycle 2 and a request on cycle 4, but does not generate personalised replies. Switch to AI mode for unscripted choices, questions, requests and conversation.

## Checks

```powershell
npm run check
npm test
```

Tests cover filename confinement, size limits, editing and listing, malformed AI decisions, and a real demo server smoke test covering HTTP, Three.js delivery, demo artifacts, and Socket.io pause/resume. The smoke test uses a disposable directory and does not change your bird’s actual mind. The symlink test skips on Windows if your account lacks permission to create symlinks.

## Troubleshooting

- **npm is not recognized:** install the full Node.js LTS distribution, including npm, and reopen the terminal.
- **Cannot reach registry.npmjs.org:** dependency installation needs internet access. Retry `npm install` on a network that allows the npm registry.
- **Port already in use:** stop the other app or change `PORT=3001` in `.env`; open http://localhost:3001 instead.
- **3D room unavailable:** enable browser hardware acceleration/WebGL and reload. The gallery and brain status still work.
- **AI request fails:** inspect the terminal message and check your key, model access, internet and API billing. The app shows an error and retries on the next cycle without erasing its mind.
- **Local AI unavailable:** run **Setup-Local-AI.cmd**, or start Ollama and download the configured model. The UI shows a local connection/model error instead of silently returning to scripted demo mode.
- **Local AI takes too long:** leave its first request time to load the model, close memory-heavy apps, or try a smaller downloaded model. Increase `AI_TIMEOUT_SECONDS` up to 600 if needed.
- **Damaged JSON data:** stop the server and repair or back up and remove the affected JSON file. Missing state is recreated; malformed state is intentionally not silently erased.

The server binds only to `127.0.0.1`. This is a local companion, with no account system. Do not expose it to the public internet without adding authentication and access controls.

GitHub Actions also installs dependencies, runs tests, and exercises the room and gallery in Chromium, including sandbox isolation, conversation, requests and mobile layout. Browser screenshots are saved as the `pip-browser-previews` workflow artifact. To run this browser check locally: `npx playwright install chromium`, then `node scripts/browser-smoke.mjs`. It adds demo interactions and a sandbox test HTML file to the local runtime workspace; use a disposable checkout if you want to preserve an existing bird untouched.
