/**
 * video-stitch — concatenate ordered video clips into a single MP4.
 *
 * Uses the bundled ffmpeg-static binary (no system install needed). Downloads
 * remote clip URLs to a temp dir, concatenates them in order, and returns the
 * path to the merged file. Falls back from stream-copy to a re-encode if the
 * clips aren't directly concatenable.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 16 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr ? String(stderr).split('\n').slice(-3).join(' ') : err.message));
      else resolve();
    });
  });
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch clip (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

/**
 * @param {string[]} urls  ordered clip URLs
 * @param {object} [opts]  { workDir }
 * @returns {Promise<{ outputPath: string, cleanup: () => void }>}
 */
async function stitchClips(urls, opts = {}) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('No clips to stitch');
  }
  const workDir = opts.workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'reelweaver-'));
  const cleanup = () => { try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {} };

  try {
    // 1. Download all clips in order.
    const files = [];
    for (let i = 0; i < urls.length; i++) {
      const dest = path.join(workDir, `clip_${String(i).padStart(3, '0')}.mp4`);
      await downloadTo(urls[i], dest);
      files.push(dest);
    }

    const outputPath = path.join(workDir, 'reelweaver_final.mp4');

    // Single clip → just copy it out.
    if (files.length === 1) {
      fs.copyFileSync(files[0], outputPath);
      return { outputPath, cleanup };
    }

    // 2. Build the concat list file.
    const listPath = path.join(workDir, 'list.txt');
    fs.writeFileSync(listPath, files.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

    // 3. Try fast stream-copy concat; fall back to a uniform re-encode.
    try {
      await run(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', outputPath]);
    } catch (_) {
      await run([
        '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-movflags', '+faststart', outputPath,
      ]);
    }
    return { outputPath, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

module.exports = { stitchClips, ffmpegPath };
