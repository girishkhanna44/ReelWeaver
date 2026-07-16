const ScriptwriterAgent = require('./ScriptwriterAgent');
const StoryboardAgent = require('./StoryboardAgent');
const VideoGeneratorAgent = require('./VideoGeneratorAgent');
const EditorAgent = require('./EditorAgent');
const config = require('../config/qwen');
const { v4: uuidv4 } = require('uuid');

class DramaForgeOrchestrator {
  constructor(options = {}) {
    this.tokenBudget = config.tokenBudget;
    this.scriptwriter = new ScriptwriterAgent(this.tokenBudget.scriptwriting);
    this.storyboarder = new StoryboardAgent(this.tokenBudget.storyboarding);
    this.videoGen = new VideoGeneratorAgent(this.tokenBudget.videoGen);
    this.editor = new EditorAgent(this.tokenBudget.editing);
    this.projectId = options.projectId || uuidv4();
    this.totalTokensUsed = 0;
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
    console.log(`[DramaForge] Starting project ${this.projectId}`);
    console.log(`[DramaForge] Token budget: ${this.tokenBudget.total}`);

    // Stage 1: Scriptwriting
    console.log('[Stage 1/4] Writing script...');
    const script = await this.scriptwriter.writeScript(brief);
    this.totalTokensUsed += script.tokenUsage;
    console.log(`[Stage 1] Script complete: ${script.scenes.length} scenes, ${script.tokenUsage} tokens`);

    // Stage 2: Storyboarding
    console.log('[Stage 2/4] Creating storyboard...');
    const storyboard = await this.storyboarder.createStoryboard(script);
    this.totalTokensUsed += storyboard.totalPromptTokens;
    console.log(`[Stage 2] Storyboard complete: ${storyboard.totalFrames} frames, ${storyboard.totalPromptTokens} tokens`);

    // Stage 3: Video Generation
    console.log('[Stage 3/4] Generating videos...');
    const videoResult = await this.videoGen.generateAllVideos(storyboard);
    this.totalTokensUsed += videoResult.totalTokenCost;
    const completedClips = videoResult.clips.filter(c => c.status === 'completed').length;
    console.log(`[Stage 3] Video gen complete: ${completedClips}/${videoResult.clips.length} clips, ${videoResult.totalTokenCost} tokens`);

    // Stage 4: Editing
    console.log('[Stage 4/4] Editing final video...');
    const editPlan = await this.editor.createEditPlan(videoResult, script);
    this.totalTokensUsed += this.editor.getTokenUsage();
    
    const finalVideo = await this.editor.renderFinalVideo(editPlan, videoResult.clips, this.projectId);
    console.log(`[Stage 4] Final video rendered: ${finalVideo.duration}s`);

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
    };

    console.log(`[DramaForge] Project ${this.projectId} complete!`);
    console.log(`[DramaForge] Total tokens: ${this.totalTokensUsed}/${this.tokenBudget.total}`);

    return output;
  }

  // For demo/testing without actual video generation
  async runDemo(brief) {
    console.log(`[DramaForge DEMO] Starting project ${this.projectId}`);
    
    // Stage 1: Script
    console.log('[Stage 1/4] Writing script...');
    const script = await this.scriptwriter.writeScript(brief);
    this.totalTokensUsed += script.tokenUsage;

    // Stage 2: Storyboard
    console.log('[Stage 2/4] Creating storyboard...');
    const storyboard = await this.storyboarder.createStoryboard(script);
    this.totalTokensUsed += storyboard.totalPromptTokens;

    // Stage 3: Video Gen (simulated)
    console.log('[Stage 3/4] Generating videos (simulated)...');
    const videoResult = await this.simulateVideoGeneration(storyboard);
    this.totalTokensUsed += videoResult.totalTokenCost;

    // Stage 4: Edit (simulated)
    console.log('[Stage 4/4] Editing (simulated)...');
    const editPlan = await this.editor.createEditPlan(videoResult, script);
    this.totalTokensUsed += this.editor.getTokenUsage();
    
    const finalVideo = {
      localPath: `./output/${this.projectId}_demo_final.mp4`,
      videoUrl: `https://qwen-cloud.example.com/outputs/${this.projectId}_demo_final.mp4`,
      duration: script.totalEstimatedDuration,
      resolution: '720p (1280x720, 9:16)',
    };

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

    console.log(`[DramaForge DEMO] Complete! Tokens: ${this.totalTokensUsed}/${this.tokenBudget.total}`);
    return output;
  }

  async simulateVideoGeneration(storyboard) {
    const clips = storyboard.frames.map(f => ({
      sceneNumber: f.sceneNumber,
      frameNumber: f.frameNumber,
      videoUrl: `https://qwen-cloud.example.com/videos/${this.projectId}_s${f.sceneNumber}_f${f.frameNumber}.mp4`,
      localPath: null,
      prompt: f.prompt,
      duration: f.duration,
      status: 'completed',
      tokenCost: Math.floor(f.prompt.length / 4) + 200,
    }));

    return {
      storyboardId: `sb_${this.projectId}`,
      clips,
      totalDuration: clips.reduce((sum, c) => sum + c.duration, 0),
      totalTokenCost: clips.reduce((sum, c) => sum + c.tokenCost, 0),
      status: 'completed',
    };
  }
}

module.exports = DramaForgeOrchestrator;

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

    const orchestrator = new DramaForgeOrchestrator({ projectId: requestId });
    
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