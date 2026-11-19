# Daily Shorts: playbook

One English YouTube Short per day on the channel **“Why?” (@askdailywhy)**, published with vidIQ.
The owner set this up and **pre-approved automatic daily publishing (public)**. A daily run does not need to ask before publishing.

## 1. Setup (fresh container)

```bash
cd shorts/engine && npm install && pip install -q scipy numpy
```

Chromium + Playwright and ffmpeg are pre-installed. Fonts used: Inter / Inter Display.

## 2. Pick today's topic

Use the date in **America/New_York**. The category follows the weekday:

| Day | Category | `category` label | Suggested motifs |
|---|---|---|---|
| Mon | Science | Science | atom, dna, crystal, bulb, ocean |
| Tue | Money & Economics | Money | coins, chart, city, globe, dice |
| Wed | Art & Culture | Art | art, book, crystal, pyramid, globe |
| Thu | Education & Learning | Learning | brain, book, bulb, clock, gears |
| Fri | Space & Astronomy | Space | solar, planet, rocket, atom, globe |
| Sat | History & Mysteries | History | pyramid, globe, book, clock, mountain |
| Sun | Human Body & Psychology | Mind & Body | brain, heart, dna, clock, bulb |

Before writing, call `vidiq_user_videos` (or `vidiq_channel_videos` for channel `UC2PyIt8PTUmm8DrWgAFF8Kw`) and read the latest
~30 titles. **Do not repeat a topic or a fact** the channel already covered.

Pick a curiosity-driven angle that people search for: "things that sound fake but are true", "why does X…",
"what happens if…", "the real reason…", "money myths", "habits of…", and so on.

## 3. Write `shorts/episodes/<YYYY-MM-DD>/content.json`

```json
{
  "date": "2026-11-19",
  "category": "Science",
  "accent": "#7fd4ff",
  "badge": "FACT",
  "hook": "5 Science Facts That Sound <em>Fake</em>",
  "hookSub": "…but every one of them is true",
  "introVisual": "atom",
  "items": [
    {"title": "Bananas Are Radioactive", "sub": "Blame potassium-40", "visual": "atom",
     "palette": {"a": "#ffe14d", "b": "#7cff9e", "c": "#fff6b0", "skyTop": "#0d0c02", "skyBot": "#2e2a08"},
     "facts": ["They contain <strong>potassium-40</strong>, a natural isotope", "…", "…"]}
  ],
  "outro": {"title": "Which one blew your mind?", "sub": "Tell us in the comments 👇", "cta": "Follow for a new fact every day"},
  "outroVisual": "solar"
}
```

Rules:
- **5 items**, each with **exactly 3 facts**. The video comes out about 52 s long (9 s per item).
- Item `title` ≤ 32 characters. Each fact ≤ 70 characters. Wrap the key number or word in `<strong>`.
- `hook` ≤ 40 characters and may wrap one word in `<em>`.
- **Accuracy first.** Use only well-established facts that you could cite (NASA, NIH, Britannica, central banks, museums).
  Round honestly ("about", "~"). Skip anything disputed or famous-but-false (for example, "we only use 10% of our brain").
- Give every item a different `visual` and a distinct palette. `skyTop`/`skyBot` are dark tones; `a`/`b`/`c` are bright accents.
- Available `visual` motifs: `atom dna planet solar brain coins chart globe book bulb art gears crystal clock mountain ocean rocket heart pyramid city dice`.

## 4. Render

```bash
cd shorts/engine
node make.js ../episodes/<date>/content.json preview     # writes ../episodes/<date>/sheet.jpg
```

Open `sheet.jpg` and check it: no text overlapping text, the titles fit, and the visuals read. Fix the content and re-run if needed.

```bash
node make.js ../episodes/<date>/content.json full ../episodes/<date>/short.mp4   # ~15-25 min, run in background
```

Music and SFX are synthesized by `audio.py`. Key, chord progression, tempo and timbre change with the date seed.

## 5. Publish with vidIQ

1. `vidiq_social_account_list` (platform `YOUTUBE`) → `platformAccountId` `UC2PyIt8PTUmm8DrWgAFF8Kw`.
2. Upload the file: call `vidiq_video_upload` with `localFile` {path, sizeBytes (`wc -c`), contentType `video/mp4`}, run the returned command,
   then call `vidiq_video_upload` again with the `uploadId` until it reports `ready`.
3. Call `vidiq_social_post_draft_create` with:
   - `title`: ≤ 70 characters, curiosity hook + `#Shorts` (for example `5 Science Facts That Sound Fake (But Are True) #Shorts`).
   - `text` (the description): a one-line hook, the 5 items as a numbered list (one line each, with an emoji), the question
     "Which one surprised you? 👇", "New fact every day, follow!", then 4-6 hashtags (`#Shorts #facts #<category> …`).
   - `tags`: 12-20 relevant search tags (topic, each item's keyword, "did you know", "facts", "shorts").
   - `categoryId`: 27 (Education), or 28 (Science & Technology) for science or space.
   - `privacyStatus`: `public`. No `publishAt`: the run is timed so that publishing now lands in the evening peak.
4. Call `vidiq_social_post_publish` with the `postId` and `revision`, then poll `vidiq_social_post_status` until it finishes and you have the `postUrl`.

## 6. Report

- Commit `shorts/episodes/<date>/content.json` (not the mp4 or the sheet) to the session's branch and push it.
- Send a push notification and end with a short message in Turkish: “✅ Bugünün Short'u yayında: <başlık> — <postUrl>”.
- If anything fails (render, upload, publish), say exactly what failed in the notification. Do not publish a broken video.
