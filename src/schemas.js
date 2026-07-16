const { z } = require('zod');

const SceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  slugline: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  action: z.string(),
  characters: z.array(z.string()),
  dialogue: z.array(z.object({
    character: z.string(),
    line: z.string(),
    parenthetical: z.string().optional(),
  })).optional(),
  visualNotes: z.string().optional(),
  estimatedDuration: z.number().positive(),
});

const ScriptSchema = z.object({
  title: z.string(),
  logline: z.string(),
  genre: z.string(),
  tone: z.string(),
  characters: z.array(z.object({
    name: z.string(),
    description: z.string(),
    arc: z.string().optional(),
  })),
  scenes: z.array(SceneSchema),
  totalEstimatedDuration: z.number().positive(),
  tokenUsage: z.number().int(),
});

const StoryboardFrameSchema = z.object({
  sceneNumber: z.number().int().positive(),
  frameNumber: z.number().int().positive(),
  prompt: z.string(),
  cameraAngle: z.string(),
  movement: z.string(),
  duration: z.number().positive(),
  promptTokens: z.number().int(),
});

const StoryboardSchema = z.object({
  scriptId: z.string().optional(),
  frames: z.array(StoryboardFrameSchema),
  totalFrames: z.number().int(),
  totalPromptTokens: z.number().int(),
  styleGuide: z.object({
    artStyle: z.string(),
    colorPalette: z.string(),
    lighting: z.string(),
  }),
});

const VideoClipSchema = z.object({
  sceneNumber: z.number().int().positive(),
  frameNumber: z.number().int().positive(),
  videoUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  prompt: z.string(),
  duration: z.number().positive(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  error: z.string().optional(),
  tokenCost: z.number().int(),
});

const VideoGenerationSchema = z.object({
  storyboardId: z.string(),
  clips: z.array(VideoClipSchema),
  totalDuration: z.number().positive(),
  totalTokenCost: z.number().int(),
  status: z.enum(['pending', 'in_progress', 'completed', 'partial', 'failed']),
});

const EditDecisionSchema = z.object({
  clipId: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  transition: z.enum(['cut', 'fade', 'dissolve', 'wipe']).optional(),
  audioCue: z.string().optional(),
});

const FinalOutputSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  videoUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  duration: z.number().positive(),
  resolution: z.string(),
  totalTokenUsage: z.number().int(),
  budgetUsed: z.number().int(),
  budgetRemaining: z.number().int(),
  metadata: z.object({
    scriptTokens: z.number().int(),
    storyboardTokens: z.number().int(),
    videoTokens: z.number().int(),
    editTokens: z.number().int(),
  }),
});

module.exports = {
  SceneSchema,
  ScriptSchema,
  StoryboardFrameSchema,
  StoryboardSchema,
  VideoClipSchema,
  VideoGenerationSchema,
  EditDecisionSchema,
  FinalOutputSchema,
};