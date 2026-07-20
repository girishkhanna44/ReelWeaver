require('dotenv').config();
const ReelWeaverOrchestrator = require('./agents/ReelWeaverOrchestrator');

async function main() {
  const brief = {
    title: 'The Last Message',
    genre: 'Sci-Fi Thriller',
    tone: 'Tense, claustrophobic, emotional',
    logline: 'A deep-space pilot receives a final message from Earth - sent 40 years ago.',
    durationSeconds: 90,
    episodeCount: 1,
    characters: [
      { name: 'Commander Mara Voss', description: 'Late 30s, weathered pilot, haunted by leaving family behind', arc: 'Acceptance of sacrifice' },
      { name: 'AI Companion "Echo"', description: 'Ship AI, calm feminine voice, subtle emotional growth', arc: 'Develops genuine empathy' },
    ],
    keyBeats: [
      'Routine patrol interrupted by ancient signal',
      'Message decodes: it\'s from her daughter, now older than Mara',
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

  const orchestrator = new ReelWeaverOrchestrator();
  const result = await orchestrator.runDemo(brief);

  console.log('\n=== REELWEAVER DEMO COMPLETE ===');
  console.log(`Project: ${result.projectId}`);
  console.log(`Title: ${result.title}`);
  console.log(`Duration: ${result.duration}s`);
  console.log(`Tokens Used: ${result.totalTokenUsage}/${result.budgetUsed} (${result.budgetRemaining} remaining)`);
  console.log(`\nScript Scenes: ${result.script.scenes.length}`);
  console.log(`Storyboard Frames: ${result.storyboard.totalFrames}`);
  console.log(`Video Clips: ${result.videoResult.clips.length}`);
  console.log(`Edit Decisions: ${result.editPlan.length}`);
  
  console.log('\n--- SCRIPT ---');
  console.log(`Title: ${result.script.title}`);
  console.log(`Logline: ${result.script.logline}`);
  result.script.scenes.forEach(s => {
    console.log(`\nScene ${s.sceneNumber}: ${s.slugline}`);
    console.log(`  ${s.action.substring(0, 150)}...`);
    s.dialogue?.forEach(d => console.log(`  ${d.character}: "${d.line.substring(0, 80)}..."`));
  });

  console.log('\n--- STORYBOARD (first 3 frames) ---');
  result.storyboard.frames.slice(0, 3).forEach(f => {
    console.log(`Frame ${f.frameNumber} (Scene ${f.sceneNumber}): ${f.prompt.substring(0, 120)}...`);
  });

  console.log('\n--- EDIT PLAN ---');
  result.editPlan.forEach((e, i) => {
    console.log(`${i + 1}. Clip S${e.sceneNumber}F${e.frameNumber} @ ${e.startTime}s-${e.endTime}s | ${e.transition || 'cut'} | ${e.audioCue || ''}`);
  });
}

main().catch(console.error);