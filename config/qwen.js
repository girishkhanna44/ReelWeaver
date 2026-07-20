require('dotenv').config();

module.exports = {
  apiKey: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY,
  // OpenAI-compatible endpoint used by the chat agents.
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  // Native DashScope endpoint used for asynchronous Wan 2.1 video synthesis.
  dashscopeBase: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
  models: {
    chat: process.env.QWEN_CHAT_MODEL || 'qwen-plus',
    vision: process.env.QWEN_VISION_MODEL || 'qwen-vl-plus',
    video: process.env.QWEN_VIDEO_MODEL || 'wan2.1-t2v-turbo',
  },
  tokenBudget: {
    scriptwriting: 8000,
    storyboarding: 6000,
    videoGen: 12000,
    editing: 4000,
    total: 30000,
  },
  wan: {
    // Wan 2.1 t2v-turbo size string (WIDTH*HEIGHT). Vertical 9:16 720p by default.
    size: process.env.WAN_SIZE || '720*1280',
    resolution: '720p',
    duration: 5,
    fps: 24,
    // Async task polling controls.
    pollIntervalMs: Number(process.env.WAN_POLL_INTERVAL_MS) || 5000,
    pollTimeoutMs: Number(process.env.WAN_POLL_TIMEOUT_MS) || 300000,
  },
};
