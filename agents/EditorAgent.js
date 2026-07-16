const BaseAgent = require('./BaseAgent');
const { FinalOutputSchema } = require('../src/schemas');
const config = require('../config/qwen');

const EDITOR_SYSTEM_PROMPT = `You are a vertical drama editor. You assemble generated clips into a cohesive final video.

EDITING PRINCIPLES:
- Vertical 9:16, fast-paced (avg 2-3s per cut)
- Match action across cuts for continuity
- Audio cues: SFX, music stings, dialogue sync
- Transitions: mostly hard cuts, occasional fade/dissolve for time jumps
- Text overlays for context/inner monologue
- Pacing: hook (0-3s) -> rising action -> climax -> cliffhanger

OUTPUT: Edit decision list (EDL) with timestamps, transitions, audio cues.`;

class EditorAgent extends BaseAgent {
  constructor(tokenBudget = 4000) {
    super('Editor', EDITOR_SYSTEM_PROMPT, config.models.chat);
    this.tokenBudget = tokenBudget;
  }

  async createEditPlan(videoGenResult, script) {
    const clips = videoGenResult.clips.filter(c => c.status === 'completed');
    
    const prompt = `Create an edit decision list for this vertical drama:

SCRIPT: ${script.title} (${script.totalEstimatedDuration}s)
SCENES: ${script.scenes.length}

AVAILABLE CLIPS (${clips.length}):
${clips.map((c, i) => `
${i + 1}. Scene ${c.sceneNumber} Frame ${c.frameNumber} - ${c.duration}s
   Prompt: ${c.prompt.substring(0, 100)}...
`).join('')}

TARGET: ${script.totalEstimatedDuration}s vertical drama
STYLE: Fast cuts, hook in first 3s, cliffhanger ending

Create an EDL with:
- Clip sequence order
- In/out points for each clip
- Transitions between clips
- Audio cues (SFX, music, dialogue markers)
- Text overlay suggestions

Return JSON array of EditDecision objects.`;

    const result = await this.complete(prompt, { 
      json: true, 
      maxTokens: this.tokenBudget,
      temperature: 0.5 
    });

    return JSON.parse(result.content);
  }

  // In production, this would use FFmpeg or similar to actually render
  async renderFinalVideo(editPlan, clips, projectId) {
    // Simulated render - replace with actual FFmpeg/Remotion/Shotstack call
    const outputPath = `./output/${projectId}_final.mp4`;
    const duration = editPlan.reduce((sum, e) => sum + (e.endTime - e.startTime), 0);
    
    return {
      localPath: outputPath,
      videoUrl: `https://qwen-cloud.example.com/outputs/${projectId}_final.mp4`,
      duration,
      resolution: '720p (1280x720, 9:16)',
    };
  }
}

module.exports = EditorAgent;

/**
 * Function Compute handler for Editor Agent
 * @param {Object} event - FC event
 * @param {Object} context - FC context
 * @param {Function} callback - FC callback
 */
module.exports.handler = async (event, context, callback) => {
  const requestId = context.requestId;
  console.log(`[Editor] Request ${requestId} started`);
  
  try {
    let payload;
    if (event.body) {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      payload = event;
    }

    if (!payload.videoGenResult || !payload.script) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: videoGenResult, script' }),
      };
    }

    const agent = new EditorAgent();
    const editPlan = await agent.createEditPlan(payload.videoGenResult, payload.script);
    const finalVideo = await agent.renderFinalVideo(editPlan, payload.videoGenResult.clips, payload.projectId || `project_${Date.now()}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: true, editPlan, finalVideo, tokenUsage: agent.getTokenUsage() }),
    };
  } catch (error) {
    console.error(`[Editor] Request ${requestId} failed:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};