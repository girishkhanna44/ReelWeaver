# 🎬 ReelWeaver — AI Showrunner for Vertical Short Dramas

**Track 2: AI Showrunner** 
[![Track](https://img.shields.io/badge/Track%202-AI%20Showrunner-6C5CE7)](https://github.com/girishkhanna44/ReelWeaver)
[![Qwen Cloud](https://img.shields.io/badge/Qwen%20Cloud-Wan%202.1-00B8D9)](https://dashscope.aliyuncs.com/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-3C873A)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> **ReelWeaver** weaves a one-paragraph creative brief into a complete vertical short drama — script, storyboard, video clips, and an edit decision list — by orchestrating four specialized Qwen agents under a strict 30K token budget.

ReelWeaver is an autonomous multi-agent pipeline that transforms a creative brief into a complete vertical short drama (90 seconds, 9:16) using Qwen models on Qwen Cloud. The system orchestrates four specialized agents — Scriptwriter, Storyboarder, Video Generator, and Editor — under a strict 30K token budget. A glassy, black-themed **web studio** (`npm run ui`) streams every stage live over Server-Sent Events.

**Repo:** https://github.com/girishkhanna44/ReelWeaver

## 🎬 Demo Output

**Title:** *The Last Message*  
**Genre:** Sci-Fi Thriller  
**Duration:** 90 seconds  
**Format:** Vertical 9:16, 720p  
**Tokens Used:** ~8,000 / 30,000 budget

```
Scene 1: Cockpit - Routine patrol interrupted by ancient signal
Scene 2: Signal decodes - message from daughter, 40 years older
Scene 3: Time dilation reveal - 40 ship years = 80 Earth years
Scene 4: Impossible choice - continue mission or turn back (cliffhanger)
```

## 🏗️ Architecture

Four specialized agents coordinated by a token-aware orchestrator:

| Stage | Agent | Model | Budget | Output |
|-------|-------|-------|--------|--------|
| 1 | **Scriptwriter** | Qwen-Plus | 8K tokens | Structured script (4 scenes) |
| 2 | **Storyboarder** | Qwen-Plus | 6K tokens | 8 frames + style guide |
| 3 | **Video Generator** | Qwen-Plus → Wan 2.1 | 12K tokens | 8 video clips (5s each) |
| 4 | **Editor** | Qwen-Plus | 4K tokens | EDL + final render |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Qwen Cloud account (for production) — [Get API key](https://dashscope.aliyuncs.com/)

### Installation
```bash
git clone https://github.com/girishkhanna44/ReelWeaver
cd ReelWeaver
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your Qwen Cloud API key
```

### Run the Web Studio (recommended)
```bash
npm run ui
# → open http://localhost:3000
```
The studio has a **Demo / Live** toggle:

- **⚡ Demo** — streams the full pipeline instantly with simulated clips. No API key required.
- **🎥 Live · Wan 2.1** — runs the real pipeline: the Scriptwriter, Storyboarder,
  Video-prompt, and Editor agents call **Qwen** (`qwen-plus`) over DashScope, and the
  Video Generator submits real **Wan 2.1** (`wan2.1-t2v-turbo`) text-to-video jobs and
  polls them to completion. Requires a `QWEN_API_KEY` in `.env`; uses credits and takes
  a few minutes.

### Live Qwen Cloud setup
1. Get a DashScope API key: https://dashscope.aliyuncs.com/
2. `cp .env.example .env` and set `QWEN_API_KEY=sk-...`
3. `npm run ui`, then pick **Live · Wan 2.1** in the studio (or `node demo.js` for the CLI).

Video generation uses DashScope's async video-synthesis API
(`POST /services/aigc/video-generation/video-synthesis` → poll `GET /tasks/{id}`),
implemented dependency-free in [`tools/dashscope-video.js`](tools/dashscope-video.js).

### Run the CLI Demo (Mock Mode - No API Key Required)
```bash
node demo.js          # plain output
node demo-video.js    # cinematic, colorized output for screen recording
```

### Run with Real Qwen Cloud API
```bash
# Requires valid QWEN_API_KEY in .env
node demo.js
```

## 🔧 Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `QWEN_API_KEY` | Qwen Cloud API key | (required for production) |
| `QWEN_BASE_URL` | API endpoint | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `QWEN_CHAT_MODEL` | LLM for agents | `qwen-plus` |
| `QWEN_VIDEO_MODEL` | Video generation | `wan2.1-t2v-turbo` |
| `TOKEN_BUDGET_TOTAL` | Total token budget | `30000` |

## 📁 Project Structure

```
ReelWeaver/
├── agents/
│   ├── BaseAgent.js              # Shared LLM client + mock mode
│   ├── ScriptwriterAgent.js      # Stage 1: Creative writing
│   ├── StoryboardAgent.js        # Stage 2: Frame breakdown
│   ├── VideoGeneratorAgent.js    # Stage 3: Wan 2.1 prompts + gen
│   ├── EditorAgent.js            # Stage 4: EDL + rendering
│   └── ReelWeaverOrchestrator.js # Pipeline coordinator
├── config/
│   └── qwen.js                   # Model config, token budgets
├── src/
│   └── schemas.js                # Zod schemas for all stages
├── ui/
│   └── public/
│       └── index.html            # Glassy black web studio (SSE live pipeline)
├── server.js                     # Zero-dependency HTTP + SSE server (npm run ui)
├── demo.js                       # CLI demo script
├── demo-video.js                 # Cinematic CLI demo for screen recording
├── index.js                      # Function Compute entry point
├── ARCHITECTURE.md               # Detailed architecture docs
├── SUMMARY.md                    # One-page submission summary
├── .env.example                  # Config template
└── package.json
```

## 🖥️ Web Studio

`npm run ui` serves a self-contained, glassy black-themed single-page studio at
`http://localhost:3000`:

- **Creative brief editor** with genre/tone presets and one-click sample briefs
- **Live pipeline** — the four agents stream their progress over Server-Sent Events
- **Token budget meter** updating per stage against the 30K budget
- **Artifact viewer** — generated script scenes, storyboard frames, and the edit decision list
- **Command palette** (`⌘/Ctrl + K`) and toast notifications

The server has **no runtime dependencies beyond the pipeline itself** (built on Node's
`http` module) and runs entirely in mock mode without an API key.

## 🎯 Track 2: AI Showrunner — Requirements Met

| Requirement | Implementation |
|-------------|----------------|
| **Scriptwriting → Storyboarding → Video Gen → Editing** | 4-agent pipeline with structured handoffs |
| **Narrative ability** | Character arcs, 3-act structure, cliffhangers |
| **Multimodal orchestration** | Text → Storyboard → Video → Audio sync |
| **Token budget optimization** | 30K total, per-stage limits, usage tracking |
| **Character consistency** | Profiles persist across all stages |
| **Vertical format** | 9:16 enforced at every stage |
| **Production quality** | 720p, cinematic prompts, EDL output |

## 🌐 Deploy a live link (Render)

The studio is an **always-on Node server**, so live Wan 2.1 renders (which take
minutes) run end-to-end — unlike serverless hosts that time out in seconds.

1. Push to GitHub (done).
2. **Render → New → Blueprint** → pick this repo. It reads [`render.yaml`](render.yaml)
   and deploys `node server.js` with a `/api/health` check.
3. Add `QWEN_API_KEY` in the service's **Environment** tab to enable **Live · Wan 2.1**
   (leave it unset to stay in Demo mode).

Full walkthrough: [deploy/render.md](deploy/render.md).

## ☁️ Alibaba Cloud Deployment

### Option 1: Function Compute (Serverless)
```bash
# Deploy each agent as separate FC function
# See deploy/ directory for Terraform/Serverless configs
```

### Option 2: ECS + Container
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["node", "demo.js"]
```

### Proof of Deployment
- Function Compute service: `reelweaver-agents`
- OSS bucket: `reelweaver-output` (video storage)
- VPC: Private network for secure API access
- DashScope API: Qwen model endpoints

## 📹 Demo Video

[Watch 3-minute demo on YouTube](https://youtube.com/watch?v=DEMO_VIDEO_ID)

Shows:
1. Creative brief input
2. Real-time agent execution with token tracking
3. Generated script, storyboard, video clips
4. Final edited vertical drama

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Submit PR with tests

## 📄 License

MIT License — see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Qwen Cloud for model access and credits
- Wan 2.1 team for video generation
- Alibaba Cloud for infrastructure

---

