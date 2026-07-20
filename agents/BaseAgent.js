const { OpenAI } = require('openai');
const config = require('../config/qwen');

class BaseAgent {
  constructor(name, systemPrompt, model = config.models.chat) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = model;
    this.tokenUsage = 0;
    this.mockMode = !config.apiKey || config.apiKey === 'your_qwen_cloud_api_key_here';
    
    if (!this.mockMode) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    }
  }

  async complete(prompt, options = {}) {
    if (this.mockMode) {
      return this.mockComplete(prompt, options);
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
      response_format: options.json ? { type: 'json_object' } : undefined,
    });

    this.tokenUsage += response.usage?.total_tokens || 0;
    return {
      content: response.choices[0].message.content,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  mockComplete(prompt, options = {}) {
    // Return mock responses based on agent type
    const mockResponses = {
      Scriptwriter: () => ({
        content: JSON.stringify({
          title: "The Last Message",
          logline: "A deep-space pilot receives a final message from Earth - sent 40 years ago.",
          genre: "Sci-Fi Thriller",
          tone: "Tense, claustrophobic, emotional",
          characters: [
            { name: "Commander Mara Voss", description: "Late 30s, weathered pilot, haunted by leaving family behind", arc: "Acceptance of sacrifice" },
            { name: 'AI Companion "Echo"', description: 'Ship AI, calm feminine voice, subtle emotional growth', arc: 'Develops genuine empathy' }
          ],
          scenes: [
            { sceneNumber: 1, slugline: "INT. COCKPIT - CONTINUOUS", location: "Spaceship Cockpit", timeOfDay: "N/A (Deep Space)", action: "MARA VOSS (30s) straps into pilot seat. Stars streak past. Routine patrol. She sips synthetic coffee. The ship's AI, ECHO, hums softly.", characters: ["Mara Voss", "Echo"], dialogue: [{ character: "Echo", line: "Commander, detecting anomalous signal. Origin: Earth sector. Age: 40 years.", parenthetical: "calm" }], visualNotes: "Close on Mara's face. Reflection of stars in helmet visor.", estimatedDuration: 20 },
            { sceneNumber: 2, slugline: "INT. COCKPIT - MOMENTS LATER", location: "Spaceship Cockpit", timeOfDay: "N/A", action: "Mara decodes the signal. Audio crackles. A woman's voice - older, tired. It's her daughter, now 60s.", characters: ["Mara Voss", "Echo"], dialogue: [{ character: "Daughter (Voice)", line: "Mom... if you're hearing this, I'm old. Older than you. You missed everything.", parenthetical: "through static" }, { character: "Mara Voss", line: "No. No, that's not possible. I left... twenty years ago.", parenthetical: "breaking" }], visualNotes: "Extreme closeup on Mara's eye. Tears in zero-g form spheres.", estimatedDuration: 25 },
            { sceneNumber: 3, slugline: "INT. COCKPIT - CONTINUOUS", location: "Spaceship Cockpit", timeOfDay: "N/A", action: "Echo calculates. Time dilation from near-light travel. 40 years ship time = 80 years Earth time.", characters: ["Mara Voss", "Echo"], dialogue: [{ character: "Echo", line: "Commander. Relativistic time dilation. Your 20-year mission... 80 years passed on Earth.", parenthetical: "gentle" }, { character: "Mara Voss", line: "She was five. My little girl. Now she's... older than me.", parenthetical: "whisper" }], visualNotes: "Wide shot. Mara small in vast cockpit. Isolation.", estimatedDuration: 25 },
            { sceneNumber: 4, slugline: "INT. COCKPIT - CONTINUOUS", location: "Spaceship Cockpit", timeOfDay: "N/A", action: "Final message plays. Daughter's goodbye. Mara faces impossible choice: continue mission or turn back (insufficient fuel).", characters: ["Mara Voss", "Echo"], dialogue: [{ character: "Daughter (Voice)", line: "I forgive you. Complete the mission. We're counting on you.", parenthetical: "fading" }, { character: "Mara Voss", line: "Echo... set course.", parenthetical: "resolute" }], visualNotes: "Push in on Mara's hand on throttle. Stars blur to streaks.", estimatedDuration: 20 },
          ],
          totalEstimatedDuration: 90,
          tokenUsage: 2847,
        }),
        tokens: 2847,
      }),
      StoryboardArtist: () => ({
        content: JSON.stringify({
          frames: [
            { sceneNumber: 1, frameNumber: 1, prompt: "Cinematic vertical shot, Commander Mara Voss in spaceship cockpit, closeup on weathered face, helmet visor reflecting streaking stars, dramatic rim lighting from console, 9:16 aspect ratio, high detail, photorealistic", cameraAngle: "closeup", movement: "static", duration: 5, promptTokens: 180 },
            { sceneNumber: 1, frameNumber: 2, prompt: "Medium shot, Mara sipping from pouch, zero-g liquid sphere floating, Echo AI hologram interface glowing soft blue, cinematic teal/orange palette, motivated lighting from control panels", cameraAngle: "medium", movement: "slow_dolly_in", duration: 5, promptTokens: 195 },
            { sceneNumber: 2, frameNumber: 3, prompt: "Extreme closeup, Mara's eye widening in shock, tear forming in zero-g forming perfect sphere, reflection of holographic waveform display, dramatic key lighting, emotional intensity", cameraAngle: "extreme_closeup", movement: "static", duration: 4, promptTokens: 165 },
            { sceneNumber: 2, frameNumber: 4, prompt: "Closeup, Mara's trembling hands on console, holographic audio waveform pulsing, daughter's voice visualization, warm amber light cutting through cool cockpit blues", cameraAngle: "closeup", movement: "slow_pan_right", duration: 5, promptTokens: 175 },
            { sceneNumber: 3, frameNumber: 5, prompt: "Medium wide, Mara and Echo AI interface, Echo's avatar manifesting as gentle geometric light form, placing hand on Mara's shoulder (holographic), emotional connection, soft warm lighting", cameraAngle: "medium", movement: "static", duration: 5, promptTokens: 185 },
            { sceneNumber: 3, frameNumber: 6, prompt: "Closeup, Echo's interface displaying time dilation calculation: 'SHIP TIME: 20 YRS | EARTH TIME: 80 YRS', numbers glowing, Mara's face in background out of focus, rack focus to numbers", cameraAngle: "closeup", movement: "rack_focus", duration: 4, promptTokens: 170 },
            { sceneNumber: 4, frameNumber: 7, prompt: "Extreme closeup, Mara's finger on throttle lever, determination in eyes, star streaks accelerating outside window, motion blur, dramatic push-in, cliffhanger moment", cameraAngle: "extreme_closeup", movement: "dolly_in", duration: 5, promptTokens: 160 },
            { sceneNumber: 4, frameNumber: 8, prompt: "Wide establishing, spaceship accelerating into hyperspace, light trails forming tunnel, 9:16 vertical composition, cinematic scale, epic conclusion", cameraAngle: "wide", movement: "dolly_out", duration: 5, promptTokens: 155 },
          ],
          totalFrames: 8,
          totalPromptTokens: 1385,
          styleGuide: { artStyle: "Cinematic vertical drama, 9:16, high production value", colorPalette: "Moody teal/orange with warm skin tones", lighting: "Motivated practical lighting, dramatic shadows" },
        }),
        tokens: 1385,
      }),
      VideoGenerator: () => ({
        content: JSON.stringify([
          { sceneNumber: 1, frameNumber: 1, wanPrompt: "Cinematic vertical 9:16, Commander Mara Voss in spaceship cockpit, closeup weathered face, helmet visor reflecting streaking stars, dramatic rim lighting from console, photorealistic, high detail, 5 seconds", negativePrompt: "blurry, low quality, distorted face, bad anatomy, horizontal composition, watermark, text", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 420 },
          { sceneNumber: 1, frameNumber: 2, wanPrompt: "Medium shot, Mara sipping from pouch, zero-g liquid sphere floating, Echo AI hologram interface glowing soft blue, cinematic teal/orange palette, motivated lighting from control panels, 5 seconds", negativePrompt: "blurry, low quality, horizontal composition, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 435 },
          { sceneNumber: 2, frameNumber: 3, wanPrompt: "Extreme closeup, Mara's eye widening in shock, tear forming in zero-g perfect sphere, reflection of holographic waveform display, dramatic key lighting, emotional intensity, 4 seconds", negativePrompt: "blurry, low quality, distorted eye, horizontal composition, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 4, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 395 },
          { sceneNumber: 2, frameNumber: 4, wanPrompt: "Closeup, Mara's trembling hands on console, holographic audio waveform pulsing, daughter's voice visualization, warm amber light cutting through cool cockpit blues, 5 seconds", negativePrompt: "blurry, low quality, horizontal, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 410 },
          { sceneNumber: 3, frameNumber: 5, wanPrompt: "Medium wide, Mara and Echo AI interface, Echo's avatar as gentle geometric light form, holographic hand on Mara's shoulder, emotional connection, soft warm lighting, 5 seconds", negativePrompt: "blurry, low quality, horizontal, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 425 },
          { sceneNumber: 3, frameNumber: 6, wanPrompt: "Closeup, Echo's interface displaying time dilation calculation 'SHIP TIME: 20 YRS | EARTH TIME: 80 YRS', numbers glowing, Mara's face in background out of focus, rack focus to numbers, 4 seconds", negativePrompt: "blurry, low quality, horizontal, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 4, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 405 },
          { sceneNumber: 4, frameNumber: 7, wanPrompt: "Extreme closeup, Mara's finger on throttle lever, determination in eyes, star streaks accelerating outside window, motion blur, dramatic push-in, cliffhanger moment, 5 seconds", negativePrompt: "blurry, low quality, horizontal, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 415 },
          { sceneNumber: 4, frameNumber: 8, wanPrompt: "Wide establishing, spaceship accelerating into hyperspace, light trails forming tunnel, 9:16 vertical composition, cinematic scale, epic conclusion, 5 seconds", negativePrompt: "blurry, low quality, horizontal, watermark", parameters: { cfg_scale: 7.5, steps: 30, duration: 5, resolution: "720p", aspect_ratio: "9:16" }, estimatedTokenCost: 390 },
        ]),
        tokens: 3295,
      }),
      Editor: () => ({
        content: JSON.stringify([
          { sceneNumber: 1, frameNumber: 1, startTime: 0, endTime: 5, transition: "cut", audioCue: "Ambient ship hum, subtle engine drone" },
          { sceneNumber: 1, frameNumber: 2, startTime: 5, endTime: 10, transition: "cut", audioCue: "Coffee sip ASMR, Echo activation chime" },
          { sceneNumber: 2, frameNumber: 3, startTime: 10, endTime: 14, transition: "cut", audioCue: "Signal static crackle, then daughter's voice" },
          { sceneNumber: 2, frameNumber: 4, startTime: 14, endTime: 19, transition: "cut", audioCue: "Daughter voice continues, emotional score swells" },
          { sceneNumber: 3, frameNumber: 5, startTime: 19, endTime: 24, transition: "fade", audioCue: "Soft piano motif, Echo's gentle hum" },
          { sceneNumber: 3, frameNumber: 6, startTime: 24, endTime: 28, transition: "cut", audioCue: "Time dilation reveal - low bass impact" },
          { sceneNumber: 4, frameNumber: 7, startTime: 28, endTime: 33, transition: "cut", audioCue: "Ticking clock SFX, heartbeat, score intensifies" },
          { sceneNumber: 4, frameNumber: 8, startTime: 33, endTime: 38, transition: "cut", audioCue: "Hyperspace WHOOSH, main theme crescendo, cut to black" },
        ]),
        tokens: 450,
      }),
    };

    const generator = mockResponses[this.name] || mockResponses.Scriptwriter;
    const response = generator();
    
    // Simulate token usage
    const mockTokens = response.tokens || Math.ceil(response.content.length / 4);
    this.tokenUsage += mockTokens;
    
    return {
      content: response.content,
      tokens: mockTokens,
    };
  }

  /**
   * Parse a JSON response from an LLM, tolerating markdown code fences and
   * leading/trailing prose that models occasionally add around JSON output.
   */
  parseJsonResponse(content) {
    if (content && typeof content === 'object') return content;
    let text = String(content || '').trim();

    // Strip ```json ... ``` or ``` ... ``` fences.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) text = fenced[1].trim();

    try {
      return JSON.parse(text);
    } catch (_) {
      // Fall back to the first balanced JSON object/array in the text.
      const start = text.search(/[[{]/);
      const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
      if (start !== -1 && end > start) {
        return JSON.parse(text.slice(start, end + 1));
      }
      throw new Error(`${this.name}: could not parse JSON from model response`);
    }
  }

  getTokenUsage() {
    return this.tokenUsage;
  }

  resetTokenUsage() {
    this.tokenUsage = 0;
  }
}

module.exports = BaseAgent;