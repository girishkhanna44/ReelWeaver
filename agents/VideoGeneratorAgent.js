const BaseAgent = require('./BaseAgent');
const { VideoGenerationSchema } = require('../src/schemas');
const config = require('../config/qwen');
const DashScopeVideo = require('../tools/dashscope-video');

const VIDEO_GEN_SYSTEM_PROMPT = `You are a Wan 2.1 video generation specialist.
You take storyboard frames and generate optimized prompts for the Wan 2.1 model.

KEY PRINCIPLES:
- Wan 2.1 excels at: character consistency, camera movement, cinematic lighting
- Max prompt length: ~500 tokens per generation
- Duration: 4-5 seconds per clip (configurable)
- Resolution: 720p (1280x720) for vertical 9:16
- Use specific camera terminology: dolly, pan, tilt, zoom, handheld
- Include lighting cues: key light, rim light, practical, motivated
- Character consistency: reference same character descriptions across frames

OUTPUT: JSON array of optimized prompts with metadata.`;

class VideoGeneratorAgent extends BaseAgent {
  constructor(tokenBudget = 12000) {
    super('VideoGenerator', VIDEO_GEN_SYSTEM_PROMPT, config.models.chat);
    this.tokenBudget = tokenBudget;
    this.wanConfig = config.wan;
    // Real Wan 2.1 client is only created when a live API key is present.
    // Without a key the agent stays in mock mode and simulates generation.
    this.videoClient = this.mockMode ? null : new DashScopeVideo({ model: config.models.video });
  }

  async generatePrompts(storyboard) {
    const frames = storyboard.frames;
    
    const prompt = `Convert these storyboard frames into optimized Wan 2.1 prompts:

STYLE GUIDE:
${JSON.stringify(storyboard.styleGuide, null, 2)}

FRAMES (${frames.length} total):
${frames.map(f => `
Frame ${f.frameNumber} (Scene ${f.sceneNumber}):
- Current prompt: ${f.prompt}
- Camera: ${f.cameraAngle}
- Movement: ${f.movement}
- Duration: ${f.duration}s
`).join('\n')}

For each frame, produce:
1. Optimized Wan 2.1 prompt (max 500 tokens, cinematic, specific)
2. Negative prompt (what to avoid)
3. Generation parameters (cfg_scale, steps, seed if reproducible)

Return JSON array matching this structure:
[
  {
    "sceneNumber": number,
    "frameNumber": number,
    "wanPrompt": "string",
    "negativePrompt": "string",
    "parameters": {
      "cfg_scale": number,
      "steps": number,
      "duration": number,
      "resolution": "720p",
      "aspect_ratio": "9:16"
    },
    "estimatedTokenCost": number
  }
]`;

    const result = await this.complete(prompt, {
      json: true,
      maxTokens: this.tokenBudget,
      temperature: 0.5
    });

    return this.parseJsonResponse(result.content);
  }

  /**
   * Generate a single clip. In live mode this calls the real Wan 2.1
   * text-to-video API on Qwen Cloud (DashScope); in mock mode it simulates.
   */
  async generateVideo(wanPrompt, params = {}) {
    const tokenCost = Math.floor(wanPrompt.length / 4) + 100;

    if (this.mockMode || !this.videoClient) {
      return {
        videoUrl: `https://qwen-cloud.example.com/videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
        localPath: undefined,
        duration: params.duration || this.wanConfig.duration,
        status: 'completed',
        tokenCost,
      };
    }

    // Live Wan 2.1 call on Qwen Cloud.
    const gen = await this.videoClient.generate(wanPrompt, {
      negativePrompt: params.negativePrompt || params.negative_prompt,
      size: params.size || (params.aspect_ratio === '9:16' ? this.wanConfig.size : undefined),
    });

    return {
      videoUrl: gen.videoUrl,
      localPath: undefined,
      duration: params.duration || this.wanConfig.duration,
      status: gen.status,
      taskId: gen.taskId,
      tokenCost,
    };
  }

  async generateAllVideos(storyboard, onProgress) {
    const optimizedPrompts = await this.generatePrompts(storyboard);
    const clips = [];
    const total = optimizedPrompts.length;
    let index = 0;

    for (const promptData of optimizedPrompts) {
      index += 1;
      const clip = {
        sceneNumber: promptData.sceneNumber,
        frameNumber: promptData.frameNumber,
        prompt: promptData.wanPrompt,
        duration: promptData.parameters.duration,
        tokenCost: promptData.estimatedTokenCost,
        status: 'pending',
      };

      if (typeof onProgress === 'function') {
        onProgress({ index, total, sceneNumber: clip.sceneNumber, frameNumber: clip.frameNumber, status: 'generating' });
      }

      try {
        const videoResult = await this.generateVideo(promptData.wanPrompt, promptData.parameters);
        clips.push({
          ...clip,
          videoUrl: videoResult.videoUrl,
          localPath: videoResult.localPath,
          status: videoResult.status,
          taskId: videoResult.taskId,
          tokenCost: videoResult.tokenCost,
        });
      } catch (error) {
        clips.push({
          ...clip,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
    const totalTokenCost = clips.reduce((sum, c) => sum + (c.tokenCost || 0), 0);

    return VideoGenerationSchema.parse({
      storyboardId: `sb_${Date.now()}`,
      clips,
      totalDuration,
      totalTokenCost,
      status: clips.every(c => c.status === 'completed') ? 'completed' : 
              clips.some(c => c.status === 'completed') ? 'partial' : 'failed',
    });
  }
}

module.exports = VideoGeneratorAgent;

/**
 * Function Compute handler for Video Generator Agent
 */
module.exports.handler = async (event, context, callback) => {
  const requestId = context.requestId;
  console.log(`[VideoGen] Request ${requestId} started`);
  
  try {
    let storyboard;
    if (event.body) {
      storyboard = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      storyboard = event;
    }

    if (!storyboard.frames || !Array.isArray(storyboard.frames)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required field: frames array' }),
      };
    }

    const agent = new VideoGeneratorAgent();
    const videoResult = await agent.generateAllVideos(storyboard);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: true, videoResult, tokenUsage: videoResult.totalTokenCost }),
    };
  } catch (error) {
    console.error(`[VideoGen] Request ${requestId} failed:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};