---
name: clips-kitty
description: Turn long videos and streams into short vertical clips with Clips Kitty, running locally on this computer. Use when someone wants clips, Shorts, Reels or TikToks made from a YouTube, Twitch or Kick link or a video file, or wants to read back or export clips Clips Kitty already made.
---

# Clips Kitty

Clips Kitty finds the moments worth posting in a long video, crops them to 9:16 with the
speaker kept in frame, burns in captions and writes titles. Everything runs on the user's
own machine: no account, no upload, no API key.

## Connecting

The tools come from Clips Kitty's MCP server, which talks to the engine on
`127.0.0.1:8765`.

```bash
claude mcp add clips-kitty -- python main.py mcp     # from a source checkout
```

In an installed build the engine's binary is `api.exe`, inside the app's `resources\backend`
folder, so the command is `api.exe mcp`.

**Clips Kitty has to be running**, either the app itself or `python main.py serve`. If a
tool reports the engine is not answering, say so and stop: starting it is the user's call,
not something to work around.

## How to work

1. **Queue** with `queue_video` (a link) or `queue_local_file` (a file on disk).
2. **Check back** with `job_status`. Processing a two-hour stream takes tens of minutes on
   a good machine. Never sit in a polling loop: report the job id, and check when the user
   next asks or after a long wait.
3. **Read the results** with `list_clips`, which gives each clip's id, score and title.
4. **Export** with `export_clip` when the user names a folder.

## Things that will otherwise catch you out

- **A queued job is not guaranteed.** `queue_video` returns "Not queued" when that video
  was processed before, because redoing it costs an hour and duplicates its clips. Offer
  `list_clips` on the existing video, or `force` if they really meant it.
- **An unknown video id looks like a video with no clips**, because the API returns an
  empty list either way. Check `list_videos` before concluding a video produced nothing.
- **A paused queue looks like a broken app.** `queue_status` reports it. Check it before
  telling anyone nothing is happening.
- **Scores are the model's ranking, 0-100**, not a promise. The user picks what to post.
- **Gaming uses its own framing.** Set `gaming=true` for its webcam/game layout and
  existing layout detector. Omit `gaming_layout` for automatic detection, or pass the
  user's selected layout and boxes. An installed game-specific detector is chosen with
  `pipeline={"id":"publisher/name"}`; discovery and permissions remain in the app.

## What it will not do

There is no cloud tier, no upload of the user's footage anywhere, and no posting to social
platforms except YouTube, which the user switches on themselves with their own Google key.
Do not offer those.

## Setup in this project (Linux / cloud session)

Clips Kitty is installed on demand, not in every session. When the user asks for clips
and `curl -s http://127.0.0.1:8765/health` does not answer, run from the repo root:

```bash
scripts/setup-clips-kitty.sh --serve
```

It clones Clips Kitty to `../clips-kitty` (if missing), installs its Python 3.12
dependencies (a few minutes on first run), starts the engine in the background and waits
for `/health`. It is safe to rerun. Without `--serve` it only installs.

Optionally register the MCP server (loads on the next session start):

```bash
claude mcp add clips-kitty -- ../clips-kitty/.venv/bin/python ../clips-kitty/main.py mcp
```

Without a GPU everything runs on CPU and is slow. Clip selection needs an LLM: a local
Ollama (`ollama pull gemma:7b`) or an OpenRouter key set in `config/settings.yaml`.
Without one, jobs will fail at the analysis step; say so rather than guessing.

## Using the HTTP API directly (when MCP tools are not loaded)

```bash
curl -X POST http://127.0.0.1:8765/jobs -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'     # -> {"job_id": N}
curl -s http://127.0.0.1:8765/jobs/N            # status
curl -s http://127.0.0.1:8765/queue             # paused?
curl -s http://127.0.0.1:8765/videos            # processed videos
curl -s http://127.0.0.1:8765/videos/VIDEO_ID/clips   # clips with score, title
```

Full reference: `docs/API.md` in the checkout, or `http://127.0.0.1:8765/docs`.
The API has no authentication; never expose port 8765 beyond localhost.
