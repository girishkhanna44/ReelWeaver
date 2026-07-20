const BaseAgent = require('./BaseAgent');
const { ScriptSchema } = require('../src/schemas');

const SCRIPTWRITER_SYSTEM_PROMPT = `You are a professional screenwriter for short-form vertical dramas (1-3 minutes per episode). 
You write tight, punchy scripts with high concept hooks, clear character arcs, and visual storytelling.

STYLE GUIDELINES:
- 3-5 scenes max, 30-60 seconds each
- Strong hook in first 3 seconds
- Visual-first storytelling (show, don't tell)
- Distinct character voices
- Clear beginning/middle/end with a twist or cliffhanger
- Vertical video format: intimate framing, fast cuts, text overlays welcome

OUTPUT FORMAT: JSON matching the provided schema exactly.
Token budget: {{TOKEN_BUDGET}} tokens max for your response.`;

class ScriptwriterAgent extends BaseAgent {
  constructor(tokenBudget = 8000) {
    super('Scriptwriter', SCRIPTWRITER_SYSTEM_PROMPT.replace('{{TOKEN_BUDGET}}', tokenBudget));
    this.tokenBudget = tokenBudget;
  }

  async writeScript(brief) {
    const prompt = `Write a complete short drama script based on this brief:

TITLE: ${brief.title}
GENRE: ${brief.genre}
TONE: ${brief.tone}
LOGLINE: ${brief.logline}
TARGET DURATION: ${brief.durationSeconds || 120} seconds (${brief.episodeCount || 1} episode)
CHARACTERS: ${JSON.stringify(brief.characters || [], null, 2)}
KEY BEATS: ${brief.keyBeats?.join(', ') || 'Surprise twist ending'}
CONSTRAINTS: ${brief.constraints?.join(', ') || 'Vertical format, fast-paced, hook in first 3s'}

Requirements:
- ${brief.episodeCount || 1} episode(s), ${brief.durationSeconds || 120}s total
- 3-5 scenes per episode
- Visual storytelling, minimal exposition
- Strong character voices
- End with hook/cliffhanger for series potential

Return JSON matching the ScriptSchema exactly.`;

    const result = await this.complete(prompt, { 
      json: true, 
      maxTokens: this.tokenBudget,
      temperature: 0.8 
    });

    const parsed = this.parseJsonResponse(result.content);
    return ScriptSchema.parse({
      ...parsed,
      tokenUsage: result.tokens,
    });
  }
}

module.exports = ScriptwriterAgent;

/**
 * Function Compute handler for Scriptwriter Agent
 * @param {Object} event - FC event
 * @param {Object} context - FC context
 * @param {Function} callback - FC callback
 */
module.exports.handler = async (event, context, callback) => {
  const requestId = context.requestId;
  console.log(`[Scriptwriter] Request ${requestId} started`);
  
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

    const agent = new ScriptwriterAgent();
    const script = await agent.writeScript(brief);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: true, script, tokenUsage: script.tokenUsage }),
    };
  } catch (error) {
    console.error(`[Scriptwriter] Request ${requestId} failed:`, error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};