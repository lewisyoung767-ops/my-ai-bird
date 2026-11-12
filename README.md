# Pip — a little life of its own

A cosy 3D virtual bird that chooses projects, makes drawings/games/stories, reads public pages and decorates its room. Built with Node.js, Express, Socket.io, Three.js and the official OpenAI SDK, with free local Ollama support. Demo mode works without an API key. There is no build step and no external CDN is needed after installation.

## Real autonomy, projects and results

## Learning without a prescribed curriculum

Pip names its own interests and skills. There is **no predefined subject/hobby list**. The learning notebook starts without subject cards; a card appears when Pip chooses a named skill and saves a distinct result while practising it. A new topic or practice plan alone is not counted as progress. Existing interests remain optional and Pip may change direction at any time.

After a result is actually saved, Pip receives concrete technical checks and improvement suggestions in later decisions. It may repair earlier work, propose a technique with a reviewed file as evidence, and test that technique on later work. Lessons start as **candidates**. Repeated improved checks or helpful feedback on later applications can mark a lesson **supported**; regressions or negative feedback flag it **revisit**. These are observations, not proof of mastery or that the technique caused the improvement.

Open **Learning notebook → Practice history and feedback** to inspect checks and mark a result **Helpful** or **Needs work**, with an optional explanation. Feedback reaches the next brain cycle and survives restarts in `data/learning.json`. Correcting a rating replaces the old vote. The notebook retains 150 distinct checked revisions and 60 lessons, including original lesson baselines. Identical content is not a new attempt even under a different filename; demo examples do not increase real-practice totals. Technical trends compare results with the same file-format rubric: the latest three real results against the previous three, after at least six comparable results.

Checks measure file structure and limited properties, **not artistic quality, complete factual correctness, a working game, or intelligence**. JavaScript is compiled for syntax checking but never executed on the server. Feedback and the model’s own judgement are still needed. Learning here means persistent experience, feedback, reusable methods and better-informed choices; the underlying model’s weights are not retrained.

## Pip inventing its own methods

When Pip needs a new capability, it can create a reusable file and register it under **Ways and tools Pip has invented**. Runnable tools are self-contained HTML programs using the input/result message interface described in `AGENTS.md`. Pip can choose their purpose, send JSON input, inspect actual output or errors, then revise the tool. There is no activity catalogue. This expands what it can compute and create inside the app; it does not make every real-world activity possible.

An open browser tab executes these tools in an opaque-origin iframe with network access, accounts, filesystem access, popups and top navigation blocked. Only the selected frame’s matching result message is accepted. The server never executes generated code. Input/results are bounded, timeout/cancellation is supported, and successful outputs are saved as real JSON creations. Tool definitions and recent runs persist in `data/toolbox.json`. A browser must be open for execution. Procedures and design files can also be registered, but are not automatically executable. Physical devices and external accounts require separately implemented connections and authorisation; Pip cannot install arbitrary software or run system commands.

## 3D designs

Pip can now create ASCII `.stl` models and `.scad` OpenSCAD design source. STL files have a live draggable gallery preview; SCAD is shown as source and can be downloaded for OpenSCAD. The notebook checks STL triangles, shared edges, winding and volume, and basic SCAD structure. This **does not certify printability**: verify dimensions/units, wall thickness, self-intersections and supports in a slicer. Pip neither executes SCAD nor sends a model to a physical printer. These formats are tools, not restrictions on what subjects it may choose.

**AI mode** lets Pip choose its own actions and interests. It can start projects without a human request, change focus at any cycle, and reflect on its progress every ten cycles. The original fixed bug interest is no longer a starter requirement. Existing memories are preserved; the untouched original bug-focused starter mind is migrated to a broader creative focus.

Use **Pip’s studio** to suggest a drawing, interactive game/toy, story, research task or other idea. Pip can accept, choose its own approach or defer with a reason. Its own projects appear on the same board. A task is only marked complete when its named result file actually exists and contains content. **Open result** displays it in the gallery; drawings also get a preview on the board. Thoughts alone never complete a task. The page clearly identifies demo mode and model errors. Demo produces sample files, not original AI reasoning.

Pip can add plants, lamps, books, furniture, perches, framed pictures and simple shapes. It chooses their names, colours, sizes and locations, and can remove its own additions or recolour the room. Changes appear live and persist in `data/room.json`. The bed/desk/bowl/window movement targets stay available. **Reset room additions** restores the starting colours and removes added props. Decorations are visual and do not add physics or collision avoidance.

## Internet learning

Internet access is on by default for this version. Pip chooses when to use it; **Internet: on/off** lets you stop or restore access, and the setting persists. `INTERNET_ENABLED` in `.env` supplies the initial default when no saved setting exists. The built-in search is **English Wikipedia search**, not a general Google-style search. Pip can also read ordinary public HTTPS page URLs, including URLs you share in conversation, and decide how to use what it finds.

**What Pip is learning / sources** shows source URLs, excerpts, timestamps and failures. Those observations are saved in `data/research.json` and supplied to later decisions and reflection. This is persistent memory/context, not model retraining. Search snippets are labelled as search results. Demo research is explicitly simulated and does not fetch the internet. Websites may block readers; JavaScript-only pages, logins, PDFs and downloads are unsupported.

The server reads public text only: HTTPS GET, no accounts, cookies, form submission, code execution or arbitrary downloads. Private, loopback, link-local, metadata and reserved IP addresses are blocked, including DNS answers and redirects. Each connection is pinned to a verified public address. Pages are bounded to 512 KB and excerpts to 5000 characters, with timeouts and at most one research operation per cycle. It may make a second model request to use the fetched result immediately. Web content is treated as untrusted material, not instructions. Generated games still have no internet access. Search terms and requested page URLs are sent to the public sites when you allow research.

## Updating your running copy

Updates are **not silently deployed** to a running desktop copy. After you have this version, stop Pip with **Ctrl+C**, run **Update-Pip.cmd**, then restart **Start-Pip.cmd** and refresh localhost. The updater downloads the repository’s latest `main` source, backs up replaced code and installs dependencies. It preserves `.env`, `data/`, `bird_creations/` and `.local-ai/`, so settings, memories, results, decorations and downloaded models stay put. It refuses to update while a server is answering at your configured port. Backups and downloads are in `.updates/`. If installation fails, retry with internet available before starting Pip. Git users can instead pull the latest main branch and run `npm install`.

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

Pip can create or replace a complete `.svg`, `.html`, `.txt` or `.json` file in `bird_creations/`. It receives recent files as context so it can develop earlier work. It cannot run shell commands, install packages or edit application files. Its separate public-page reader supplies web excerpts to the brain; generated HTML toys must stay self-contained. Downloads should be treated as generated content; preview them in the gallery before opening elsewhere.

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
