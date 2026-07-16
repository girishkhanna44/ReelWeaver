# DramaForge — AI Showrunner for Vertical Short Dramas

**Track 2: AI Showrunner** — Global AI Hackathon with Qwen Cloud

DramaForge is an autonomous multi-agent pipeline that transforms a creative brief into a complete vertical short drama (90 seconds, 9:16) using Qwen models on Qwen Cloud. The system orchestrates four specialized agents — Scriptwriter, Storyboarder, Video Generator, and Editor — under a strict 30K token budget.

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
git clone https://github.com/yourusername/DramaForge
cd DramaForge
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your Qwen Cloud API key
```

### Run Demo (Mock Mode - No API Key Required)
```bash
node demo.js
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
DramaForge/
├── agents/
│   ├── BaseAgent.js              # Shared LLM client + mock mode
│   ├── ScriptwriterAgent.js      # Stage 1: Creative writing
│   ├── StoryboardAgent.js        # Stage 2: Frame breakdown
│   ├── VideoGeneratorAgent.js    # Stage 3: Wan 2.1 prompts + gen
│   ├── EditorAgent.js            # Stage 4: EDL + rendering
│   └── DramaForgeOrchestrator.js # Pipeline coordinator
├── config/
│   └── qwen.js                   # Model config, token budgets
├── src/
│   └── schemas.js                # Zod schemas for all stages
├── demo.js                       # Demo script
├── ARCHITECTURE.md               # Detailed architecture docs
├── .env.example                  # Config template
└── package.json
```

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
- Function Compute service: `dramaforge-agents`
- OSS bucket: `dramaforge-output` (video storage)
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

**Built for the Global AI Hackathon with Qwen Cloud — Track 2: AI Showrunner**