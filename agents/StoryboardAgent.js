const BaseAgent = require('./BaseAgent');
const { StoryboardSchema } = require('../src/schemas');

const STORYBOARD_SYSTEM_PROMPT = `You are a storyboard artist for vertical short dramas. 
You break scripts into detailed frame-by-frame prompts for Wan 2.1 video generation.

STORYBOARD PRINCIPLES:
- 1 frame = 1 video generation call (4-5 seconds each)
- Vertical 9:16 aspect ratio
- Consistent character appearance across frames
- Explicit camera directions for cinematic quality
- Style guide enforcement for visual cohesion
- Token-efficient prompts (max 500 tokens/frame)

STYLE GUIDE (apply consistently):
- Art style: {{ART_STYLE}}
- Color palette: {{COLOR_PALETTE}}
- Lighting: {{LIGHTING}}

OUTPUT FORMAT: JSON matching StoryboardSchema exactly.
Token budget: {{TOKEN_BUDGET}} tokens max.`;

class StoryboardAgent extends BaseAgent {
  constructor(tokenBudget = 6000) {
    const styleGuide = {
      artStyle: 'Cinematic vertical drama, 9:16, high production value',
      colorPalette: 'Moody teal/orange with warm skin tones',
      lighting: 'Motivated practical lighting, dramatic shadows',
    };
    const systemPrompt = STORYBOARD_SYSTEM_PROMPT
      .replace('{{ART_STYLE}}', styleGuide.artStyle)
      .replace('{{COLOR_PALETTE}}', styleGuide.colorPalette)
      .replace('{{LIGHTING}}', styleGuide.lighting)
      .replace('{{TOKEN_BUDGET}}', tokenBudget);
    super('StoryboardArtist', systemPrompt);
    this.tokenBudget = tokenBudget;
    this.styleGuide = styleGuide;
  }

  async createStoryboard(script) {
    const sceneSummaries = script.scenes.map(s => 
      `Scene ${s.sceneNumber}: ${s.slugline} - ${s.action.substring(0, 200)}`
    ).join('\n');

    const prompt = `Break this script into storyboard frames for Wan 2.1 video generation:

SCRIPT TITLE: ${script.title}
TOTAL DURATION: ${script.totalEstimatedDuration}s
SCENES:
${sceneSummaries}

FULL SCRIPT:
${JSON.stringify(script, null, 2)}

For EACH scene, create 2-4 frames (4-5 seconds each).
Total frames: ~${Math.ceil(script.totalEstimatedDuration / 5)} frames max.

Each frame must include:
- Detailed Wan 2.1 prompt (subject, action, camera, lighting, style)
- Camera angle: extreme_closeup/closeup/medium/wide/extreme_wide
- Movement: static/pan_left/pan_right/tilt_up/tilt_down/dolly_in/dolly_out/zoom
- Duration (4-5s)

Return JSON matching StoryboardSchema with styleGuide.`;

    const result = await this.complete(prompt, { 
      json: true, 
      maxTokens: this.tokenBudget,
      temperature: 0.6 
    });

    const parsed = JSON.parse(result.content);
    return StoryboardSchema.parse({
      ...parsed,
      scriptId: parsed.scriptId || `script_${Date.now()}`,
      styleGuide: this.styleGuide,
      totalPromptTokens: result.tokens,
    });
  }
}

module.exports = StoryboardAgent;

/**
 * Function Compute handler for Storyboard Agent
 */
module.exports.handler = async (event, context, callback) => {
  const requestId = context.requestId;
  console.log(`[Storyboard] Request ${requestId} started`);
  
  try {
    let script;
    if (event.body) {
      script = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      script = event;
    }

    if (!script.title || !script.scenes) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields: title, scenes' }),
      };
    }

    const agent = new StoryboardAgent();
    const storyboard = await agent.createStoryboard(script);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: true, storyboard, tokenUsage: storyboard.totalPromptTokens }),
    };
  } catch (error) {
    console.error(`[Storyboard] Request ${requestId} failed:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};