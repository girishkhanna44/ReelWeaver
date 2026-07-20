/**
 * DashScopeVideo — Wan 2.1 text-to-video client (Qwen Cloud / DashScope)
 *
 * Wraps DashScope's asynchronous video-synthesis API:
 *   1. POST .../services/aigc/video-generation/video-synthesis  (X-DashScope-Async: enable) → task_id
 *   2. GET  .../tasks/{task_id}  (poll until SUCCEEDED / FAILED)  → video_url
 *
 * Uses the global `fetch` (Node 18+). No third-party HTTP dependency.
 * Docs: https://help.aliyun.com/zh/model-studio/developer-reference/text-to-video-api
 */

const config = require('../config/qwen');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class DashScopeVideo {
  constructor(options = {}) {
    this.apiKey = options.apiKey || config.apiKey;
    this.base = (options.base || config.dashscopeBase).replace(/\/$/, '');
    this.model = options.model || config.models.video;
    this.pollIntervalMs = options.pollIntervalMs || config.wan.pollIntervalMs;
    this.pollTimeoutMs = options.pollTimeoutMs || config.wan.pollTimeoutMs;

    if (!this.apiKey) {
      throw new Error('DashScopeVideo: missing API key (set QWEN_API_KEY / DASHSCOPE_API_KEY).');
    }
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Submit an async text-to-video task. Returns the DashScope task_id.
   */
  async submitTask(prompt, { negativePrompt, size } = {}) {
    const url = `${this.base}/services/aigc/video-generation/video-synthesis`;
    const body = {
      model: this.model,
      input: {
        prompt,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
      parameters: {
        size: size || config.wan.size,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...this.headers, 'X-DashScope-Async': 'enable' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`DashScope submit failed (${res.status}): ${data.message || data.code || res.statusText}`);
    }
    const taskId = data.output && data.output.task_id;
    if (!taskId) {
      throw new Error(`DashScope submit returned no task_id: ${JSON.stringify(data)}`);
    }
    return taskId;
  }

  /**
   * Poll a task until it reaches a terminal state, or the timeout elapses.
   */
  async pollTask(taskId, { shouldStop } = {}) {
    const url = `${this.base}/tasks/${taskId}`;
    const deadline = Date.now() + this.pollTimeoutMs;

    while (Date.now() < deadline) {
      if (shouldStop && shouldStop()) {
        return { status: 'stopped', taskId };
      }
      const res = await fetch(url, { headers: this.headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`DashScope poll failed (${res.status}): ${data.message || res.statusText}`);
      }

      const output = data.output || {};
      const status = output.task_status;

      if (status === 'SUCCEEDED') {
        return {
          status: 'completed',
          videoUrl: output.video_url,
          taskId,
          usage: data.usage || null,
        };
      }
      if (status === 'FAILED' || status === 'CANCELED' || status === 'UNKNOWN') {
        throw new Error(`DashScope task ${status}: ${output.message || 'no detail'}`);
      }
      // PENDING / RUNNING → keep polling.
      await sleep(this.pollIntervalMs);
    }
    throw new Error(`DashScope task ${taskId} timed out after ${this.pollTimeoutMs}ms`);
  }

  /**
   * Generate one clip end-to-end: submit + poll. Returns { videoUrl, status, taskId }.
   */
  async generate(prompt, opts = {}) {
    const taskId = await this.submitTask(prompt, opts);
    return this.pollTask(taskId, { shouldStop: opts.shouldStop });
  }
}

module.exports = DashScopeVideo;
