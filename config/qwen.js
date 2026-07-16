require('dotenv').config();

module.exports = {
  apiKey: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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
    resolution: '720p',
    duration: 5,
    fps: 24,
  },
};