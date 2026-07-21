const ScriptwriterAgent = require('./ScriptwriterAgent');
const StoryboardAgent = require('./StoryboardAgent');
const VideoGeneratorAgent = require('./VideoGeneratorAgent');
const EditorAgent = require('./EditorAgent');
const config = require('../config/qwen');
const { v4: uuidv4 } = require('uuid');

class ReelWeaverOrchestrator {
  constructor(options = {}) {
    this.tokenBudget = config.tokenBudget;
    this.scriptwriter = new ScriptwriterAgent(this.tokenBudget.scriptwriting);
    this.storyboarder = new StoryboardAgent(this.tokenBudget.storyboarding);
    this.videoGen = new VideoGeneratorAgent(this.tokenBudget.videoGen);
    this.editor = new EditorAgent(this.tokenBudget.editing);
    this.projectId = options.projectId || uuidv4();
    this.totalTokensUsed = 0;
    // Optional progress hook: (event) => void. Used by the UI server to stream
    // live stage-by-stage updates over Server-Sent Events.
    this.onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    // Optional cancellation hook: () => boolean. When it returns true, video
    // generation stops early and the pipeline proceeds to the editor.
    this.shouldStop = typeof options.shouldStop === 'function' ? options.shouldStop : () => false;
  }

  emit(stage, status, data = {}) {
    this.onProgress({
      stage,
      status,
      projectId: this.projectId,
      tokensUsed: this.totalTokensUsed,
      tokenBudget: this.tokenBudget.total,
      ...data,
    });
  }

  getTokenBudget() {
    return {
      total: this.tokenBudget.total,
      used: this.totalTokensUsed,
      remaining: this.tokenBudget.total - this.totalTokensUsed,
      byStage: {
        scriptwriting: this.scriptwriter.getTokenUsage(),
        storyboarding: this.storyboarder.getTokenUsage(),
        videoGen: this.videoGen.getTokenUsage(),
        editing: this.editor.getTokenUsage(),
      },
    };
  }

  async run(brief) {
    console.log(`[ReelWeaver] Starting project ${this.projectId}`);
    console.log(`[ReelWeaver] Token budget: ${this.tokenBudget.total}`);
    this.emit('init', 'started', { title: brief.title, budget: this.tokenBudget, live: true });

    // Stage 1: Scriptwriting
    console.log('[Stage 1/4] Writing script...');
    this.emit('scriptwriting', 'running');
    const script = await this.scriptwriter.writeScript(brief);
    this.totalTokensUsed += script.tokenUsage;
    console.log(`[Stage 1] Script complete: ${script.scenes.length} scenes, ${script.tokenUsage} tokens`);
    this.emit('scriptwriting', 'done', { script, tokens: script.tokenUsage });

    // Stage 2: Storyboarding
    console.log('[Stage 2/4] Creating storyboard...');
    this.emit('storyboarding', 'running');
    const storyboard = await this.storyboarder.createStoryboard(script);
    this.totalTokensUsed += storyboard.totalPromptTokens;
    console.log(`[Stage 2] Storyboard complete: ${storyboard.totalFrames} frames, ${storyboard.totalPromptTokens} tokens`);
    this.emit('storyboarding', 'done', { storyboard, tokens: storyboard.totalPromptTokens });

    // Stage 3: Video Generation (real Wan 2.1 calls when a live API key is set)
    console.log('[Stage 3/4] Generating videos...');
    this.emit('videoGen', 'running');
    const videoResult = await this.videoGen.generateAllVideos(
      storyboard,
      (p) => this.emit('videoGen', 'progress', p),
      this.shouldStop
    );
    this.totalTokensUsed += videoResult.totalTokenCost;
    const completedClips = videoResult.clips.filter(c => c.status === 'completed').length;
    const stopped = this.shouldStop();
    console.log(`[Stage 3] Video gen ${stopped ? 'stopped' : 'complete'}: ${completedClips}/${videoResult.clips.length} clips, ${videoResult.totalTokenCost} tokens`);
    this.emit('videoGen', 'done', { videoResult, tokens: videoResult.totalTokenCost, stopped });

    // Stage 4: Editing
    console.log('[Stage 4/4] Editing final video...');
    this.emit('editing', 'running');
    const editPlan = await this.editor.createEditPlan(videoResult, script);
    this.totalTokensUsed += this.editor.getTokenUsage();

    const finalVideo = await this.editor.renderFinalVideo(editPlan, videoResult.clips, this.projectId);
    console.log(`[Stage 4] Final video rendered: ${finalVideo.duration}s`);
    this.emit('editing', 'done', { editPlan, finalVideo, tokens: this.editor.getTokenUsage() });

    // Final output
    const output = {
      projectId: this.projectId,
      title: script.title,
      videoUrl: finalVideo.videoUrl,
      localPath: finalVideo.localPath,
      duration: finalVideo.duration,
      resolution: finalVideo.resolution,
      totalTokenUsage: this.totalTokensUsed,
      budgetUsed: this.totalTokensUsed,
      budgetRemaining: this.tokenBudget.total - this.totalTokensUsed,
      metadata: {
        scriptTokens: script.tokenUsage,
        storyboardTokens: storyboard.totalPromptTokens,
        videoTokens: videoResult.totalTokenCost,
        editTokens: this.editor.getTokenUsage(),
      },
      // Full artifacts so the studio can render script/storyboard/EDL in live mode too.
      script,
      storyboard,
      videoResult,
      editPlan,
    };

    console.log(`[ReelWeaver] Project ${this.projectId} complete!`);
    console.log(`[ReelWeaver] Total tokens: ${this.totalTokensUsed}/${this.tokenBudget.total}`);
    this.emit('complete', 'done', { output });

    return output;
  }

  // For demo/testing without actual video generation
  async runDemo(brief) {
    console.log(`[ReelWeaver DEMO] Starting project ${this.projectId}`);
    this.emit('init', 'started', { title: brief.title, budget: this.tokenBudget });

    // Stage 1: Script
    console.log('[Stage 1/4] Writing script...');
    this.emit('scriptwriting', 'running');
    const script = await this.scriptwriter.writeScript(brief);
    this.totalTokensUsed += script.tokenUsage;
    this.emit('scriptwriting', 'done', { script, tokens: script.tokenUsage });

    // Stage 2: Storyboard
    console.log('[Stage 2/4] Creating storyboard...');
    this.emit('storyboarding', 'running');
    const storyboard = await this.storyboarder.createStoryboard(script);
    this.totalTokensUsed += storyboard.totalPromptTokens;
    this.emit('storyboarding', 'done', { storyboard, tokens: storyboard.totalPromptTokens });

    // Stage 3: Video Gen (simulated)
    console.log('[Stage 3/4] Generating videos (simulated)...');
    this.emit('videoGen', 'running');
    const videoResult = await this.simulateVideoGeneration(
      storyboard,
      (p) => this.emit('videoGen', 'progress', p)
    );
    this.totalTokensUsed += videoResult.totalTokenCost;
    this.emit('videoGen', 'done', { videoResult, tokens: videoResult.totalTokenCost });

    // Stage 4: Edit (simulated)
    console.log('[Stage 4/4] Editing (simulated)...');
    this.emit('editing', 'running');
    const editPlan = await this.editor.createEditPlan(videoResult, script);
    this.totalTokensUsed += this.editor.getTokenUsage();

    const finalVideo = {
      localPath: `./output/${this.projectId}_demo_final.mp4`,
      videoUrl: `https://qwen-cloud.example.com/outputs/${this.projectId}_demo_final.mp4`,
      duration: script.totalEstimatedDuration,
      resolution: '720p (1280x720, 9:16)',
    };
    this.emit('editing', 'done', { editPlan, finalVideo, tokens: this.editor.getTokenUsage() });

    const output = {
      projectId: this.projectId,
      title: script.title,
      videoUrl: finalVideo.videoUrl,
      localPath: finalVideo.localPath,
      duration: finalVideo.duration,
      resolution: finalVideo.resolution,
      totalTokenUsage: this.totalTokensUsed,
      budgetUsed: this.totalTokensUsed,
      budgetRemaining: this.tokenBudget.total - this.totalTokensUsed,
      metadata: {
        scriptTokens: script.tokenUsage,
        storyboardTokens: storyboard.totalPromptTokens,
        videoTokens: videoResult.totalTokenCost,
        editTokens: this.editor.getTokenUsage(),
      },
      // Include full artifacts for demo
      script,
      storyboard,
      videoResult,
      editPlan,
    };

    console.log(`[ReelWeaver DEMO] Complete! Tokens: ${this.totalTokensUsed}/${this.tokenBudget.total}`);
    this.emit('complete', 'done', { output });
    return output;
  }

  async simulateVideoGeneration(storyboard, onProgress) {
    const frames = storyboard.frames;
    const total = frames.length;
    const clips = [];
    for (let i = 0; i < total; i++) {
      const f = frames[i];
      if (typeof onProgress === 'function') {
        onProgress({ type: 'generating', index: i + 1, total, sceneNumber: f.sceneNumber, frameNumber: f.frameNumber });
      }
      // Small delay so the studio shows clips appearing one by one, like a real render.
      await new Promise(r => setTimeout(r, 120));
      const clip = {
        sceneNumber: f.sceneNumber,
        frameNumber: f.frameNumber,
        videoUrl: `https://qwen-cloud.example.com/videos/${this.projectId}_s${f.sceneNumber}_f${f.frameNumber}.mp4`,
        localPath: null,
        prompt: f.prompt,
        duration: f.duration,
        status: 'completed',
        tokenCost: Math.floor(f.prompt.length / 4) + 200,
      };
      clips.push(clip);
      if (typeof onProgress === 'function') {
        onProgress({ type: 'clip', index: i + 1, total, clip });
      }
    }

    return {
      storyboardId: `sb_${this.projectId}`,
      clips,
      totalDuration: clips.reduce((sum, c) => sum + c.duration, 0),
      totalTokenCost: clips.reduce((sum, c) => sum + c.tokenCost, 0),
      status: 'completed',
    };
  }
}

module.exports = ReelWeaverOrchestrator;

/**
 * Function Compute handler for Orchestrator Agent
 * @param {Object} event - FC event
 * @param {Object} context - FC context
 * @param {Function} callback - FC callback
 */
module.exports.handler = async (event, context, callback) => {
  const requestId = context.requestId;
  console.log(`[Orchestrator] Request ${requestId} started`);

  try {
    let brief;
    if (event.body) {
      brief = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      brief = event;
    }

    if (!brief.title || !brief.logline) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: title, logline' }),
      };
    }

    const orchestrator = new ReelWeaverOrchestrator({ projectId: requestId });

    // Check if demo mode requested
    const mode = brief.mode || (brief.demo ? 'demo' : 'production');
    let result;

    if (mode === 'demo') {
      result = await orchestrator.runDemo(brief);
    } else {
      result = await orchestrator.run(brief);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: true, result, tokenUsage: orchestrator.getTokenBudget() }),
    };
  } catch (error) {
    console.error(`[Orchestrator] Request ${requestId} failed:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};
