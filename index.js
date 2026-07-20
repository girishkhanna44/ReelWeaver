/**
 * ReelWeaver - Function Compute Entry Point
 *
 * This is the main handler for Alibaba Cloud Function Compute.
 * It orchestrates the full AI Showrunner pipeline.
 */

const ReelWeaverOrchestrator = require('./agents/ReelWeaverOrchestrator');
const AliyunOSS = require('./tools/aliyun-oss');

/**
 * Main FC Handler
 * @param {Object} event - FC event object
 * @param {Object} context - FC context object
 * @param {Function} callback - FC callback
 */
exports.handler = async (event, context, callback) => {
  const startTime = Date.now();
  const requestId = context.requestId;
  
  console.log(`[ReelWeaver] Request ${requestId} started`);

  try {
    // Parse request body
    let brief;
    if (event.body) {
      brief = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (event.pathParameters) {
      // Handle GET requests with query params
      brief = event.queryParameters || {};
    } else {
      brief = event;
    }

    // Validate required fields
    if (!brief.title || !brief.logline) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Invalid request',
          message: 'Missing required fields: title, logline',
          example: {
            title: 'The Last Message',
            genre: 'Sci-Fi Thriller',
            tone: 'Tense, emotional',
            logline: 'A pilot receives a message from Earth sent 40 years ago.',
            durationSeconds: 90,
            characters: [{ name: 'Commander Mara Voss', description: 'Weathered pilot' }],
            keyBeats: ['Signal received', 'Time dilation reveal', 'Impossible choice'],
            constraints: ['Vertical 9:16', 'Hook in 3s', 'Cliffhanger ending'],
          },
        }),
      };
    }

    console.log(`[ReelWeaver] Processing: ${brief.title} (${brief.durationSeconds || 90}s)`);

    // Initialize orchestrator with request ID as project ID
    const orchestrator = new ReelWeaverOrchestrator({
      projectId: requestId,
    });

    // Run full pipeline
    const result = await orchestrator.run(brief);

    // Upload final video to OSS if available
    if (result.localPath) {
      try {
        const oss = new AliyunOSS();
        const uploadResult = await oss.uploadVideo(result.localPath, result.projectId);
        result.videoUrl = uploadResult.url;
        result.ossKey = uploadResult.key;
        console.log(`[ReelWeaver] Video uploaded to OSS: ${uploadResult.key}`);
      } catch (ossError) {
        console.error('[ReelWeaver] OSS upload failed:', ossError.message);
        result.ossError = ossError.message;
      }
    }

    // Calculate total processing time
    const processingTime = Date.now() - startTime;
    result.processingTimeMs = processingTime;

    console.log(`[ReelWeaver] Request ${requestId} completed in ${processingTime}ms`);
    console.log(`[ReelWeaver] Tokens used: ${result.totalTokenUsage}/${result.budgetUsed}`);

    // Return success response
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        success: true,
        projectId: result.projectId,
        title: result.title,
        duration: result.duration,
        resolution: result.resolution,
        videoUrl: result.videoUrl,
        ossKey: result.ossKey,
        tokenUsage: {
          total: result.totalTokenUsage,
          budget: result.budgetUsed,
          remaining: result.budgetRemaining,
          byStage: result.metadata,
        },
        processingTimeMs: processingTime,
      }),
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[ReelWeaver] Request ${requestId} failed after ${processingTime}ms:`, error);

    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        requestId,
        processingTimeMs: processingTime,
      }),
    };
  }
};

/**
 * Health check endpoint
 */
exports.health = async (event, context, callback) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'healthy',
      service: 'ReelWeaver',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  };
};

/**
 * Token budget status endpoint
 */
exports.budget = async (event, context, callback) => {
  const config = require('./config/qwen');
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenBudget: config.tokenBudget,
      models: config.models,
    }),
  };
};