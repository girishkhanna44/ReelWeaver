#!/usr/bin/env node
/**
 * DramaForge Demo Script for Video Recording
 * 
 * Run this script and record your screen for the 3-minute demo video.
 * It prints beautiful formatted output showing each stage of the pipeline.
 */

require('dotenv').config();
const DramaForgeOrchestrator = require('./agents/DramaForgeOrchestrator');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function header(title) {
  const line = '═'.repeat(60);
  console.log(`\n${c('cyan', line)}`);
  console.log(`${c('bright', c('cyan', `  ${title}`))}`);
  console.log(`${c('cyan', line)}\n`);
}

function stage(num, total, title) {
  console.log(`${c('bgBlue', ' STAGE ')} ${c('blue', `${num}/${total}`)} ${c('bright', title)}`);
  console.log(`${c('dim', '─'.repeat(50))}`);
}

function success(msg) {
  console.log(`${c('green', '✓')} ${msg}`);
}

function info(label, value) {
  console.log(`  ${c('dim', label)}: ${c('white', value)}`);
}

function tokenBar(used, total) {
  const pct = Math.round((used / total) * 100);
  const bars = Math.round(pct / 5);
  const bar = '█'.repeat(bars) + '░'.repeat(20 - bars);
  const color = pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green';
  return `${c(color, bar)} ${c('bright', `${pct}%`)} (${used}/${total})`;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  // Clear screen
  console.clear();

  // Title screen
  console.log(`
${c('bgBlue', ' '.repeat(60))}
${c('bgBlue', '  ██████╗ ██████╗ ██████╗ ███████╗██╗     ██╗    ██████╗  ')}${c('reset')}
${c('bgBlue', '  ██╔══██╗██╔══██╗██╔══██╗██╔════╝██║     ██║    ╚════██╗ ')}${c('reset')}
${c('bgBlue', '  ██████╔╝██████╔╝██████╔╝█████╗  ██║     ██║     █████╔╝ ')}${c('reset')}
${c('bgBlue', '  ██╔══██╗██╔═══╝ ██╔══██╗██╔══╝  ██║     ██║     ╚═══██╗ ')}${c('reset')}
${c('bgBlue', '  ██║  ██║██║     ██║  ██║███████╗███████╗██║    ██████╔╝ ')}${c('reset')}
${c('bgBlue', '  ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝    ╚═════╝  ')}${c('reset')}
${c('bgBlue', ' '.repeat(60))}
${c('bgBlue', '           AI SHOWRUNNER • Track 2: AI Showrunner           ')}${c('reset')}
${c('bgBlue', '           Global AI Hackathon with Qwen Cloud              ')}${c('reset')}
${c('bgBlue', ' '.repeat(60))}${c('reset')}
  `);

  await sleep(1000);

  // Creative Brief
  header('📋 CREATIVE BRIEF');
  
  const brief = {
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

  info('Title', brief.title);
  info('Genre', brief.genre);
  info('Tone', brief.tone);
  info('Logline', brief.logline);
  info('Duration', `${brief.durationSeconds}s (${brief.episodeCount} episode)`);
  info('Characters', brief.characters.map(c => c.name).join(', '));
  info('Key Beats', brief.keyBeats.length);
  info('Constraints', brief.constraints.length);

  await sleep(1500);

  // Initialize Orchestrator
  header('🎭 DRAMAFORGE PIPELINE INITIALIZATION');
  
  const orchestrator = new DramaForgeOrchestrator();
  info('Project ID', orchestrator.projectId);
  info('Token Budget', `${orchestrator.tokenBudget.total.toLocaleString()} tokens`);
  info('Stages', 'Scriptwriter → Storyboarder → VideoGen → Editor');
  
  const budget = orchestrator.getTokenBudget();
  console.log(`\n  Budget Allocation:`);
  Object.entries(budget.byStage).forEach(([stage, tokens]) => {
    const pct = Math.round((tokens / budget.total) * 100);
    console.log(`    ${stage.padEnd(20)} ${tokenBar(tokens, budget.total)}`);
  });

  await sleep(1500);

  // Stage 1: Scriptwriting
  stage(1, 4, 'SCRIPTWRITER AGENT (Qwen-Plus)');
  console.log(`${c('dim', 'Prompt:')} Creative brief → Structured screenplay`);
  console.log(`${c('dim', 'Budget:')} 8,000 tokens | ${c('dim', 'Temperature:')} 0.8\n`);
  
  const script = await orchestrator.scriptwriter.writeScript(brief);
  orchestrator.totalTokensUsed += script.tokenUsage;
  
  success(`Script complete: ${c('bright', script.title)}`);
  info('Scenes', script.scenes.length);
  info('Characters', script.characters.length);
  info('Duration', `${script.totalEstimatedDuration}s`);
  info('Tokens Used', script.tokenUsage.toLocaleString());
  
  console.log(`\n  ${c('cyan', 'Scene Breakdown:')}`);
  script.scenes.forEach(s => {
    console.log(`    ${c('dim', `Scene ${s.sceneNumber}:`)} ${s.slugline}`);
    console.log(`      ${c('dim', 'Action:')} ${s.action.substring(0, 80)}...`);
    if (s.dialogue?.length) {
      s.dialogue.forEach(d => {
        console.log(`      ${c('yellow', d.character)}: "${d.line.substring(0, 60)}..."`);
      });
    }
  });

  await sleep(1500);

  // Stage 2: Storyboarding
  stage(2, 4, 'STORYBOARD AGENT (Qwen-Plus)');
  console.log(`${c('dim', 'Prompt:')} Script → Frame-by-frame visual prompts`);
  console.log(`${c('dim', 'Budget:')} 6,000 tokens | ${c('dim', 'Temperature:')} 0.6\n`);
  
  const storyboard = await orchestrator.storyboarder.createStoryboard(script);
  orchestrator.totalTokensUsed += storyboard.totalPromptTokens;
  
  success(`Storyboard complete: ${c('bright', storyboard.totalFrames)} frames`);
  info('Total Frames', storyboard.totalFrames);
  info('Prompt Tokens', storyboard.totalPromptTokens.toLocaleString());
  info('Style Guide', storyboard.styleGuide.artStyle);
  
  console.log(`\n  ${c('cyan', 'Frames:')}`);
  storyboard.frames.forEach(f => {
    const cam = c('dim', `[${f.cameraAngle}]`);
    const mov = c('dim', `{${f.movement}}`);
    console.log(`    ${c('green', `Frame ${f.frameNumber}`)} ${cam} ${mov} ${c('dim', `${f.duration}s`)}`);
    console.log(`      ${f.prompt.substring(0, 100)}...`);
  });

  await sleep(1500);

  // Stage 3: Video Generation
  stage(3, 4, 'VIDEO GENERATOR AGENT (Wan 2.1 via Qwen Cloud)');
  console.log(`${c('dim', 'Prompt:')} Storyboard frames → Wan 2.1 optimized prompts → Video`);
  console.log(`${c('dim', 'Budget:')} 12,000 tokens | ${c('dim', 'Resolution:')} 720p 9:16 | ${c('dim', 'Duration:')} 5s/clip\n`);
  
  console.log(`  ${c('yellow', '⏳ Generating video clips...')}`);
  await sleep(500);
  
  const videoResult = await orchestrator.videoGen.generateAllVideos(storyboard);
  orchestrator.totalTokensUsed += videoResult.totalTokenCost;
  
  const completed = videoResult.clips.filter(c => c.status === 'completed').length;
  success(`Video generation complete: ${c('bright', `${completed}/${videoResult.clips.length}`)} clips`);
  info('Total Duration', `${videoResult.totalDuration}s`);
  info('Token Cost', videoResult.totalTokenCost.toLocaleString());
  info('Status', videoResult.status);
  
  console.log(`\n  ${c('cyan', 'Generated Clips:')}`);
  videoResult.clips.forEach(clip => {
    const status = clip.status === 'completed' ? c('green', '✓') : c('red', '✗');
    console.log(`    ${status} Scene ${clip.sceneNumber} Frame ${clip.frameNumber} (${clip.duration}s) - ${clip.tokenCost} tokens`);
  });

  await sleep(1500);

  // Stage 4: Editing
  stage(4, 4, 'EDITOR AGENT (Qwen-Plus)');
  console.log(`${c('dim', 'Prompt:')} Clips + Script → Edit Decision List → Final Render`);
  console.log(`${c('dim', 'Budget:')} 4,000 tokens | ${c('dim', 'Target:')} Vertical drama pacing\n`);
  
  const editPlan = await orchestrator.editor.createEditPlan(videoResult, script);
  orchestrator.totalTokensUsed += orchestrator.editor.getTokenUsage();
  
  const finalVideo = await orchestrator.editor.renderFinalVideo(editPlan, videoResult.clips, orchestrator.projectId);
  
  success(`Final video rendered: ${c('bright', finalVideo.duration)}s`);
  info('Resolution', finalVideo.resolution);
  info('Edit Decisions', editPlan.length);
  info('Tokens Used', orchestrator.editor.getTokenUsage().toLocaleString());

  console.log(`\n  ${c('cyan', 'Edit Decision List:')}`);
  editPlan.forEach((e, i) => {
    const trans = e.transition ? c('dim', `[${e.transition}]`) : '';
    console.log(`    ${i + 1}. S${e.sceneNumber}F${e.frameNumber} @ ${e.startTime}s-${e.endTime}s ${trans}`);
    if (e.audioCue) console.log(`       ${c('dim', '🔊')} ${e.audioCue}`);
  });

  await sleep(1000);

  // Final Summary
  header('📊 FINAL RESULTS');
  
  const totalUsed = orchestrator.totalTokensUsed;
  const totalBudget = orchestrator.tokenBudget.total;
  const remaining = totalBudget - totalUsed;
  
  console.log(`\n  ${c('bright', 'Project:')} ${orchestrator.projectId}`);
  console.log(`  ${c('bright', 'Title:')} ${script.title}`);
  console.log(`  ${c('bright', 'Duration:')} ${finalVideo.duration}s (${finalVideo.resolution})`);
  console.log(`  ${c('bright', 'Video URL:')} ${finalVideo.videoUrl}`);
  
  console.log(`\n  ${c('bright', 'Token Usage:')}`);
  console.log(`    ${c('green', 'Scriptwriting:')}  ${orchestrator.scriptwriter.getTokenUsage()}`);
  console.log(`    ${c('blue', 'Storyboarding:')}  ${orchestrator.storyboarder.getTokenUsage()}`);
  console.log(`    ${c('yellow', 'Video Gen:')}      ${orchestrator.videoGen.getTokenUsage()}`);
  console.log(`    ${c('magenta', 'Editing:')}        ${orchestrator.editor.getTokenUsage()}`);
  console.log(`    ${c('bright', 'TOTAL:')}          ${c('bright', totalUsed.toLocaleString())} / ${totalBudget.toLocaleString()}`);
  
  console.log(`\n  ${c('bright', 'Budget Remaining:')} ${c('green', remaining.toLocaleString())} tokens (${Math.round(remaining/totalBudget*100)}%)`);
  
  console.log(`\n  ${c('bgGreen', ' '.repeat(60))}`);
  console.log(`  ${c('bgGreen', '  ✓ PIPELINE COMPLETE — 90s Vertical Drama Generated  ')}`);
  console.log(`  ${c('bgGreen', ' '.repeat(60))}`);
  
  console.log(`\n${c('dim', 'Submit to: Global AI Hackathon with Qwen Cloud — Track 2: AI Showrunner')}`);
  console.log(`${c('dim', 'Deadline: July 20, 2026')}\n`);
}

// Run demo
runDemo().catch(err => {
  console.error(c('red', '\n✗ Demo failed:'), err);
  process.exit(1);
});