# DramaForge Architecture

## System Overview

```mermaid
flowchart TB
    subgraph Input["🎬 Creative Brief"]
        Brief[("Creative Brief\nTitle, Genre, Tone, Logline\nCharacters, Key Beats")]
    end

    subgraph Orchestrator["🎭 DramaForge Orchestrator"]
        Orch[/"Token Budget Manager\n(30K total budget)"/]
    end

    subgraph Stage1["📝 Stage 1: Scriptwriter Agent\n(Budget: 8K tokens)"]
        SW1[/"Qwen-Plus LLM\nSystem Prompt: Screenwriter"/]
        SW2[("Structured Output:\nScriptSchema\n4 scenes, 90s total")]
        SW1 --> SW2
    end

    subgraph Stage2["🎨 Stage 2: Storyboard Agent\n(Budget: 6K tokens)"]
        SB1[/"Qwen-Plus LLM\nSystem Prompt: Storyboard Artist"/]
        SB2[("Structured Output:\nStoryboardSchema\n8 frames, style guide")]
        SB1 --> SB2
    end

    subgraph Stage3["🎥 Stage 3: Video Generator Agent\n(Budget: 12K tokens)"]
        VG1[/"Qwen-Plus LLM\nOptimize prompts for Wan 2.1"/]
        VG2[/"Wan 2.1 API (Qwen Cloud)\nText-to-Video Generation"/]
        VG3[("Video Clips:\n8 clips × 5s = 40s raw\n720p, 9:16, 24fps")]
        VG1 --> VG2 --> VG3
    end

    subgraph Stage4["✂️ Stage 4: Editor Agent\n(Budget: 4K tokens)"]
        ED1[/"Qwen-Plus LLM\nSystem Prompt: Vertical Editor"/]
        ED2[("Edit Decision List:\n8 decisions, transitions,\naudio cues, text overlays")]
        ED3[/"FFmpeg / Remotion\nRender Final Video"/]
        ED4[("Final Output:\n90s vertical drama\n720p, 9:16, MP4")]
        ED1 --> ED2 --> ED3 --> ED4
    end

    subgraph Storage["☁️ Alibaba Cloud Infrastructure"]
        OSS[(OSS Bucket\nVideo Storage)]
        FC[("Function Compute\nServerless Execution")]
        VPC[("VPC / Private Network")]
    end

    Brief --> Orch
    Orch --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> OSS
    Orch -.-> FC
    Orch -.-> VPC

    style Orch fill:#f9f,stroke:#333
    style Stage1 fill:#bbf,stroke:#333
    style Stage2 fill:#bfb,stroke:#333
    style Stage3 fill:#ffb,stroke:#333
    style Stage4 fill:#fbf,stroke:#333
    style Storage fill:#eef,stroke:#333
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Orch as Orchestrator
    participant SW as Scriptwriter
    participant SB as Storyboarder
    participant VG as VideoGen
    participant ED as Editor
    participant OSS as Alibaba Cloud OSS

    User->>Orch: Creative Brief
    Orch->>SW: Brief + Budget(8K)
    SW-->>Orch: Script (4 scenes, 2847 tokens)
    Orch->>SB: Script + Budget(6K)
    SB-->>Orch: Storyboard (8 frames, 1385 tokens)
    Orch->>VG: Storyboard + Budget(12K)
    VG->>VG: Optimize prompts for Wan 2.1
    VG->>QwenCloud: 8× Wan 2.1 API calls
    QwenCloud-->>VG: 8 video clips (40s total)
    VG-->>Orch: Video clips + metadata (3295 tokens)
    Orch->>ED: Clips + Script + Budget(4K)
    ED-->>Orch: Edit Decision List (450 tokens)
    Orch->>ED: Render final video
    ED->>OSS: Upload final MP4
    OSS-->>Orch: Public video URL
    Orch-->>User: Final drama + token report
```

## Token Budget Allocation

| Stage | Budget | Typical Usage | Purpose |
|-------|--------|---------------|---------|
| Scriptwriting | 8,000 | ~2,800 | Creative writing, character voices |
| Storyboarding | 6,000 | ~1,400 | Frame breakdown, camera directions |
| Video Generation | 12,000 | ~3,300 | Wan 2.1 prompt optimization + generation |
| Editing | 4,000 | ~450 | EDL creation, pacing decisions |
| **Total** | **30,000** | **~8,000** | **22K buffer for iterations** |

## Key Innovations

### 1. Token-Aware Pipeline
- Each agent receives explicit token budget
- Orchestrator tracks cumulative usage
- Automatic budget enforcement with graceful degradation

### 2. Character Consistency System
- Character profiles persisted across all stages
- Visual descriptors injected into storyboard & video prompts
- Negative prompts prevent drift

### 3. Vertical-First Cinematography
- 9:16 aspect ratio enforced at every stage
- Camera vocabulary optimized for mobile viewing
- Fast-cut pacing (2-3s average shot length)

### 4. Production-Ready Output
- Structured schemas (Zod) for type safety
- Edit Decision List compatible with FFmpeg/Remotion
- Alibaba Cloud OSS integration for delivery

## Deployment Architecture

```mermaid
flowchart LR
    subgraph Local["💻 Local Development"]
        Dev[Node.js App\nDramaForge]
    end

    subgraph Cloud["☁️ Alibaba Cloud"]
        FC[Function Compute\n(Serverless Agents)]
        OSS[OSS Bucket\nVideo Assets]
        Dash[DashScope API\nQwen Models]
        VPC[VPC Network]
    end

    Dev -->|Deploy| FC
    FC -->|API Calls| Dash
    FC -->|Store Videos| OSS
    FC -.->|Private Access| VPC
    OSS -->|CDN Delivery| User((👤 Viewer))
```

## Running the Demo

```bash
# Install dependencies
npm install

# Configure API key (get from Qwen Cloud)
cp .env.example .env
# Edit .env with your QWEN_API_KEY

# Run demo (mock mode works without API key)
node demo.js

# Run with real API (requires Qwen Cloud credits)
# Set QWEN_API_KEY in .env
node demo.js
```

## Project Structure

```
DramaForge/
├── agents/
│   ├── BaseAgent.js           # Shared LLM client + mock mode
│   ├── ScriptwriterAgent.js   # Stage 1: Creative writing
│   ├── StoryboardAgent.js     # Stage 2: Frame breakdown
│   ├── VideoGeneratorAgent.js # Stage 3: Wan 2.1 prompts + gen
│   ├── EditorAgent.js         # Stage 4: EDL + rendering
│   └── DramaForgeOrchestrator.js  # Pipeline coordinator
├── config/
│   └── qwen.js                # Model config, token budgets
├── src/
│   └── schemas.js             # Zod schemas for all stages
├── demo.js                    # Demo script
├── .env.example               # Config template
└── package.json
```

## Submission Checklist (Track 2: AI Showrunner)

- [x] **Architecture Diagram** - Mermaid diagrams above
- [x] **Core Pipeline** - 4-agent orchestrated workflow
- [x] **Token Budget Management** - 30K total with per-stage limits
- [x] **Character Consistency** - Profiles persist across stages
- [x] **Vertical Video Format** - 9:16, 720p, fast-paced editing
- [x] **Wan 2.1 Integration** - Optimized prompts for text-to-video
- [x] **Demo Output** - 90s sci-fi drama "The Last Message"
- [ ] **Alibaba Cloud Deployment** - Function Compute + OSS
- [ ] **3-min Demo Video** - Screen recording of pipeline
- [ ] **Public GitHub Repo** - MIT license, all source code
- [ ] **Devpost Submission** - Before Jul 20, 2026 deadline