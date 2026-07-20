/**
 * ReelWeaver — Local Web Studio Server
 *
 * A zero-dependency HTTP server (built on Node's `http` module) that serves the
 * glassy black web studio and exposes the AI Showrunner pipeline over a simple API:
 *
 *   GET  /                     → the web studio (ui/public/index.html)
 *   GET  /api/health           → service health
 *   GET  /api/budget           → token budget + model config
 *   GET  /api/sample-brief      → a ready-to-run creative brief
 *   POST /api/generate         → run the full pipeline, return the final result JSON
 *   POST /api/generate/stream  → run the pipeline, streaming each stage as Server-Sent Events
 *
 * Runs in mock mode with no API key, so the whole pipeline can be demoed offline.
 * Set QWEN_API_KEY in .env to switch the agents to live Qwen Cloud calls.
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const ReelWeaverOrchestrator = require('./agents/ReelWeaverOrchestrator');
const config = require('./config/qwen');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'ui', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const SAMPLE_BRIEF = {
  title: 'The Last Message',
  genre: 'Sci-Fi Thriller',
  tone: 'Tense, claustrophobic, emotional',
  logline: 'A deep-space pilot receives a final message from Earth — sent 40 years ago.',
  durationSeconds: 90,
  episodeCount: 1,
  characters: [
    { name: 'Commander Mara Voss', description: 'Late 30s, weathered pilot, haunted by leaving family behind', arc: 'Acceptance of sacrifice' },
    { name: 'AI Companion "Echo"', description: 'Ship AI, calm feminine voice, subtle emotional growth', arc: 'Develops genuine empathy' },
  ],
  keyBeats: [
    'Routine patrol interrupted by ancient signal',
    "Message decodes: it's from her daughter, now older than Mara",
    'Realization: time dilation made her 40-year trip = 80 years Earth time',
    'Final choice: continue mission or turn back (impossible)',
  ],
  constraints: [
    'Vertical 9:16 format',
    'Hook in first 3 seconds',
    'Single location (cockpit)',
    'Two characters only (one voice-only)',
    'Cliffhanger ending for series potential',
  ],
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { // 1MB guard
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeBrief(brief) {
  // Accept characters/keyBeats/constraints as newline- or comma-separated strings from the UI.
  const toList = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      return v.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };
  const characters = Array.isArray(brief.characters)
    ? brief.characters
    : toList(brief.characters).map((line) => {
        const [name, ...rest] = line.split(/[:\-–]/);
        return { name: (name || '').trim(), description: rest.join(':').trim() };
      });
  return {
    title: (brief.title || '').trim(),
    genre: (brief.genre || 'Drama').trim(),
    tone: (brief.tone || 'Cinematic, emotional').trim(),
    logline: (brief.logline || '').trim(),
    durationSeconds: Number(brief.durationSeconds) || 90,
    episodeCount: Number(brief.episodeCount) || 1,
    characters,
    keyBeats: toList(brief.keyBeats),
    constraints: toList(brief.constraints),
  };
}

function validateBrief(brief) {
  if (!brief.title) return 'Missing required field: title';
  if (!brief.logline) return 'Missing required field: logline';
  return null;
}

async function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  rel = decodeURIComponent(rel.split('?')[0]);
  // Prevent path traversal.
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const urlPath = (req.url || '/').split('?')[0];

  try {
    // ---- API routes ----
    if (urlPath === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'healthy',
        service: 'ReelWeaver',
        version: '1.0.0',
        mockMode: !config.apiKey || config.apiKey === 'your_qwen_cloud_api_key_here',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }

    if (urlPath === '/api/budget' && method === 'GET') {
      return sendJson(res, 200, { tokenBudget: config.tokenBudget, models: config.models });
    }

    if (urlPath === '/api/sample-brief' && method === 'GET') {
      return sendJson(res, 200, SAMPLE_BRIEF);
    }

    if (urlPath === '/api/generate' && method === 'POST') {
      const raw = await readBody(req);
      const brief = normalizeBrief(raw);
      const error = validateBrief(brief);
      if (error) return sendJson(res, 400, { success: false, error });

      const orchestrator = new ReelWeaverOrchestrator();
      const result = raw.mode === 'live'
        ? await orchestrator.run(brief)
        : await orchestrator.runDemo(brief);
      return sendJson(res, 200, { success: true, result, tokenUsage: orchestrator.getTokenBudget() });
    }

    if (urlPath === '/api/generate/stream' && method === 'POST') {
      const raw = await readBody(req);
      const brief = normalizeBrief(raw);
      const error = validateBrief(brief);
      if (error) return sendJson(res, 400, { success: false, error });

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const write = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

      const live = raw.mode === 'live';
      const mock = !config.apiKey || config.apiKey === 'your_qwen_cloud_api_key_here';
      if (live && mock) {
        write({ stage: 'error', status: 'failed', error: 'Live mode needs a QWEN_API_KEY in .env — falling back to demo.' });
      }

      const orchestrator = new ReelWeaverOrchestrator({ onProgress: write });
      try {
        const result = (live && !mock) ? await orchestrator.run(brief) : await orchestrator.runDemo(brief);
        write({ stage: 'result', status: 'done', result, tokenUsage: orchestrator.getTokenBudget() });
      } catch (err) {
        write({ stage: 'error', status: 'failed', error: err.message });
      }
      res.write('event: end\ndata: {}\n\n');
      return res.end();
    }

    if (urlPath.startsWith('/api/')) {
      return sendJson(res, 404, { success: false, error: 'Unknown API route' });
    }

    // ---- Static files ----
    if (method === 'GET') {
      return serveStatic(req, res, urlPath);
    }

    res.writeHead(405, { 'Content-Type': 'text/plain' }).end('Method not allowed');
  } catch (err) {
    console.error('[ReelWeaver] Request error:', err);
    if (!res.headersSent) sendJson(res, 500, { success: false, error: err.message });
    else res.end();
  }
});

server.listen(PORT, () => {
  const mock = !config.apiKey || config.apiKey === 'your_qwen_cloud_api_key_here';
  console.log('');
  console.log('  🎬  ReelWeaver Studio');
  console.log(`  ▶  http://localhost:${PORT}`);
  console.log(`  ⚙  Mode: ${mock ? 'MOCK (no API key — offline demo)' : 'LIVE (Qwen Cloud)'}`);
  console.log(`  💠  Token budget: ${config.tokenBudget.total.toLocaleString()}`);
  console.log('');
});

module.exports = server;
