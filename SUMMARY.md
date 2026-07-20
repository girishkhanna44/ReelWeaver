# ReelWeaver — Submission Summary

**Track 2: AI Showrunner** · Global AI Hackathon with Qwen Cloud
**Repo:** https://github.com/girishkhanna44/ReelWeaver

## One-liner

ReelWeaver weaves a one-paragraph creative brief into a complete **vertical short
drama** (90s, 9:16) — script → storyboard → video clips → edit decision list — by
orchestrating four specialized Qwen agents under a strict **30,000-token budget**.

## What it does

| Stage | Agent | Model | Budget | Output |
|-------|-------|-------|--------|--------|
| 1 | Scriptwriter | Qwen-Plus | 8K | Structured 4-scene script |
| 2 | Storyboarder | Qwen-Plus | 6K | 8 frames + style guide |
| 3 | Video Generator | Qwen-Plus → Wan 2.1 | 12K | 8 clips (5s each), 720p 9:16 |
| 4 | Editor | Qwen-Plus | 4K | Edit decision list + final render |

A token-aware **ReelWeaverOrchestrator** coordinates the agents, tracks cumulative
usage, and enforces the per-stage budget. All hand-offs are validated with Zod schemas.

## How to run

```bash
npm install
npm run ui        # glassy black web studio at http://localhost:3000 (mock mode, no key)
node demo.js      # CLI demo
node demo-video.js  # cinematic CLI demo for screen recording
```

Add a `QWEN_API_KEY` to `.env` to switch from mock mode to live Qwen Cloud calls.

## Highlights

- **Multi-agent orchestration** with structured, schema-validated hand-offs.
- **Token-budget optimization** — 30K total, per-stage caps, live usage tracking.
- **Vertical-first cinematography** — 9:16 enforced at every stage.
- **Character consistency** — profiles persist across script, storyboard, and video prompts.
- **Live web studio** streaming each stage over Server-Sent Events, zero extra deps.
- **Alibaba Cloud ready** — Function Compute (`deploy/template.yml`, `deploy/serverless.yml`)
  and OSS video storage (`reelweaver-output`).

## Demo output

**"The Last Message"** — a sci-fi thriller: a deep-space pilot receives a 40-year-old
message from her now-elderly daughter, realizes time dilation cost her a lifetime, and
faces an impossible choice. 4 scenes, 8 storyboard frames, 90s, ~8K/30K tokens used.

---

Built for the **Global AI Hackathon with Qwen Cloud — Track 2: AI Showrunner**.
