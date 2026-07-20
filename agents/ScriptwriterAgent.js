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
    const normalized = this.normalizeScript(parsed, brief, result.tokens);

    const check = ScriptSchema.safeParse(normalized);
    if (!check.success) {
      const fields = [...new Set(check.error.issues.map(i => i.path.join('.')).filter(Boolean))].join(', ');
      throw new Error(`Scriptwriter: the model's script was missing/invalid fields (${fields}). Try again or lower the duration.`);
    }
    return check.data;
  }

  // Fill sensible defaults so a slightly-off live model response still validates.
  normalizeScript(p, brief = {}, tokens = 0) {
    const scenes = (Array.isArray(p.scenes) ? p.scenes : []).map((s, i) => ({
      sceneNumber: Number(s.sceneNumber) || i + 1,
      slugline: s.slugline || s.heading || s.title || `SCENE ${i + 1}`,
      location: s.location || 'Unspecified',
      timeOfDay: s.timeOfDay || s.time || 'N/A',
      action: s.action || s.description || s.summary || '',
      characters: Array.isArray(s.characters)
        ? s.characters.map(c => (typeof c === 'string' ? c : c && c.name)).filter(Boolean)
        : [],
      dialogue: Array.isArray(s.dialogue)
        ? s.dialogue
            .map(d => ({ character: d.character || d.name || 'Character', line: d.line || d.text || '', parenthetical: d.parenthetical }))
            .filter(d => d.line)
        : undefined,
      visualNotes: s.visualNotes || s.notes,
      estimatedDuration: Number(s.estimatedDuration) || Number(s.duration) || 15,
    }));

    const totalFromScenes = scenes.reduce((sum, s) => sum + s.estimatedDuration, 0);

    return {
      title: p.title || brief.title || 'Untitled',
      logline: p.logline || brief.logline || '',
      genre: p.genre || brief.genre || 'Drama',
      tone: p.tone || brief.tone || 'Cinematic',
      characters: (Array.isArray(p.characters) ? p.characters : (brief.characters || [])).map(c => ({
        name: (typeof c === 'string' ? c : c.name) || 'Character',
        description: (typeof c === 'object' && (c.description || c.desc)) || '',
        arc: typeof c === 'object' ? c.arc : undefined,
      })),
      scenes,
      totalEstimatedDuration: Number(p.totalEstimatedDuration) || totalFromScenes || Number(brief.durationSeconds) || 90,
      tokenUsage: tokens,
    };
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