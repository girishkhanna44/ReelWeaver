# Deploy ReelWeaver live on Render

Render runs the studio as an **always-on Node web service** — no serverless
timeout — so real **Wan 2.1** video jobs (which take minutes) run end-to-end.
This is the easiest way to get a live, shareable link with real Qwen Cloud video.

## Prerequisites
- A [Render](https://render.com) account (the free plan works for a demo).
- Your code pushed to GitHub (already done: `github.com/girishkhanna44/ReelWeaver`).
- A DashScope / Qwen Cloud API key from https://dashscope.aliyuncs.com/.

## Deploy (Blueprint — 2 minutes)
1. Go to **Render → New → Blueprint**.
2. Connect your GitHub and select the **ReelWeaver** repo. Render reads
   [`render.yaml`](../render.yaml) and previews a web service named `reelweaver`.
3. Click **Apply**. Render runs `npm install` then `node server.js`.
4. When the service is live, open its URL — the studio loads in **Demo mode**.

## Turn on Live mode (real Wan 2.1)
1. In the Render dashboard, open the `reelweaver` service → **Environment**.
2. Add **`QWEN_API_KEY`** = your DashScope key (`sk-...`) and **Save**.
   (The other Qwen/Wan variables already come from `render.yaml`.)
3. Render redeploys automatically. Reload the studio and pick **🎥 Live · Wan 2.1**.

## Notes
- **Free plan** sleeps after ~15 min idle and cold-starts on the next request —
  fine for judging, but do a warm-up click before recording your demo.
- Live video renders can take a few minutes per clip; the studio streams progress
  and the server sends SSE heartbeats so the connection stays open.
- Health check: `GET /api/health` (returns `mockMode: true/false`).

## Troubleshooting: `401 Incorrect API key`
This means Qwen Cloud rejected the key. Checklist:
1. **Region mismatch (most common).** Model Studio has two regions with separate keys.
   If your key was created in the **International** console, set:
   - `QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
   - `DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/api/v1`
   (Mainland-China keys use the `dashscope.aliyuncs.com` hosts.)
2. **Key value.** Copy it fresh from the console — no spaces/quotes. It starts with `sk-`.
3. **Activate Model Studio** and confirm `qwen-plus` / `wan2.1-t2v-turbo` are enabled for your account.
4. **Verify quickly:** open `https://<your-app>/api/test-key` — it makes one tiny call and
   tells you `ok: true/false` plus the exact error and a hint. `/api/health` shows which
   endpoint and models are configured (no secret is exposed).

## Manual deploy (without the Blueprint)
Render → **New → Web Service** → pick the repo, then set:
- **Build command:** `npm install`
- **Start command:** `node server.js`
- **Health check path:** `/api/health`
- **Environment:** add `QWEN_API_KEY` (and optionally `WAN_SIZE=720*1280`).

## Alternative: Alibaba Function Compute
The repo also ships FC configs in [`deploy/template.yml`](template.yml) and
[`deploy/serverless.yml`](serverless.yml) with 900s timeouts — see
[`deploy/README.md`](README.md). Use this if you want to stay entirely on
Alibaba Cloud infrastructure for the submission.
