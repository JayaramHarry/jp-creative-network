import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import fs from 'fs';

/**
 * Merges a silent customized WebM video (canvas recording) with an audio source
 * (either extracted from the original template video, custom uploaded, or muted)
 * and exports a highly compatible MP4 (H.264 / AAC) file.
 * 
 * @param {object} params
 * @param {string} params.videoPath - Local path of the recorded silent WebM
 * @param {string} params.originalVideoPath - Local path of the original template MP4
 * @param {string} params.audioPath - Local path of custom uploaded audio (if replace)
 * @param {string} params.audioOption - 'keep' | 'replace' | 'mute'
 * @param {number|string} [params.trimStart] - Trim start offset in seconds
 * @param {number|string} [params.trimEnd] - Trim end offset in seconds
 * @param {string} params.outputPath - Local destination path for the final MP4
 * @returns {Promise<string>} Path of the compiled MP4
 */
export const processCustomVideo = ({
  videoPath,
  originalVideoPath,
  audioPath,
  audioOption,
  trimStart,
  trimEnd,
  bgMusicPath,
  originalVolume = 1.0,
  customAudioVolume = 1.0,
  bgMusicVolume = 0.5,
  duration,
  inserts,
  overlays,
  outputPath
}) => {
  return new Promise((resolve, reject) => {
    const args = ['-y'];

    // Input 0: Silent recorded WebM video
    args.push('-i', videoPath);

    let inputCount = 1;
    let primaryAudioLabel = '';
    let bgMusicLabel = '';

    const hasTrim = (
      trimStart !== undefined && 
      trimEnd !== undefined && 
      trimStart !== null && 
      trimEnd !== null && 
      (parseFloat(trimStart) > 0 || parseFloat(trimEnd) > 0)
    );

    // Primary audio mapping
    if (audioOption === 'keep' && originalVideoPath && fs.existsSync(originalVideoPath)) {
      if (hasTrim) {
        args.push('-ss', String(trimStart), '-to', String(trimEnd));
      }
      args.push('-i', originalVideoPath);
      primaryAudioLabel = `${inputCount}:a`;
      inputCount++;
    } else if (audioOption === 'replace' && audioPath && fs.existsSync(audioPath)) {
      if (hasTrim) {
        args.push('-ss', String(trimStart), '-to', String(trimEnd));
      }
      args.push('-i', audioPath);
      primaryAudioLabel = `${inputCount}:a`;
      inputCount++;
    }

    // Background music mapping
    if (bgMusicPath && fs.existsSync(bgMusicPath)) {
      args.push('-i', bgMusicPath);
      bgMusicLabel = `${inputCount}:a`;
      inputCount++;
    }

    // Map insert video inputs
    const sortedInserts = (inserts || [])
      .map(i => ({
        startTime: parseFloat(i.startTime),
        endTime: parseFloat(i.endTime),
        videoPath: i.videoPath,
        audioPath: i.audioPath,
        audioOption: i.audioOption,
        volume: parseFloat(i.volume !== undefined ? i.volume : 1.0),
        audioTrimStart: parseFloat(i.audioTrimStart || 0),
        audioTrimEnd: parseFloat(i.audioTrimEnd || 0),
        url: i.url
      }))
      .sort((a, b) => a.startTime - b.startTime);

    sortedInserts.forEach(insert => {
      if (insert.audioOption === 'replace' && insert.audioPath && fs.existsSync(insert.audioPath)) {
        args.push('-i', insert.audioPath);
        insert.audioInputIndex = inputCount;
        inputCount++;
      } else if (insert.videoPath && fs.existsSync(insert.videoPath)) {
        args.push('-i', insert.videoPath);
        insert.inputIndex = inputCount;
        inputCount++;
      }
    });

    // Map overlay inputs
    const sortedOverlays = (overlays || [])
      .map(o => ({
        startTime: parseFloat(o.startTime),
        endTime: parseFloat(o.endTime),
        videoPath: o.videoPath,
        audioPath: o.audioPath,
        audioOption: o.audioOption,
        volume: parseFloat(o.volume),
        audioTrimStart: parseFloat(o.audioTrimStart || 0),
        audioTrimEnd: parseFloat(o.audioTrimEnd || 0)
      }))
      .filter(o => o.audioOption !== 'mute');

    sortedOverlays.forEach(overlay => {
      if (overlay.audioOption === 'replace' && overlay.audioPath && fs.existsSync(overlay.audioPath)) {
        args.push('-i', overlay.audioPath);
        overlay.audioInputIndex = inputCount;
        inputCount++;
      } else if (overlay.videoPath && fs.existsSync(overlay.videoPath)) {
        args.push('-i', overlay.videoPath);
        overlay.inputIndex = inputCount;
        inputCount++;
      }
    });

    // Audio filter mixing graph
    let filterComplexStr = '';
    const hasAudio = !!(primaryAudioLabel || bgMusicLabel || sortedInserts.some(i => i.inputIndex !== undefined || i.audioInputIndex !== undefined) || sortedOverlays.some(o => o.inputIndex !== undefined || o.audioInputIndex !== undefined));

    // Build sequential original audio delay slicing filter if there are timeline insertions
    let seqAudioFilter = '';

    if (audioOption === 'keep' && primaryAudioLabel && sortedInserts.length > 0) {
      const filterParts = [];
      const concatLabels = [];
      let currentTemplateTime = 0;
      let segmentIndex = 0;
      let offset = 0;

      for (const insert of sortedInserts) {
        const templatePausePoint = insert.startTime - offset;
        if (templatePausePoint > currentTemplateTime + 0.05) {
          filterParts.push(`[${primaryAudioLabel}]atrim=start=${currentTemplateTime}:end=${templatePausePoint},asetpts=PTS-STARTPTS[a_seg_${segmentIndex}];`);
          concatLabels.push(`[a_seg_${segmentIndex}]`);
          segmentIndex++;
          currentTemplateTime = templatePausePoint;
        }
        
        if (insert.audioOption === 'mute') {
          // Silence segment during muted insert
          filterParts.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${insert.endTime - insert.startTime},asetpts=PTS-STARTPTS[silence_${segmentIndex}];`);
          concatLabels.push(`[silence_${segmentIndex}]`);
        } else if (insert.audioOption === 'replace' && insert.audioInputIndex !== undefined) {
          // Replacement audio for insert
          const trimS = insert.audioTrimStart || 0;
          const trimE = insert.audioTrimEnd || (insert.endTime - insert.startTime + trimS);
          filterParts.push(`[${insert.audioInputIndex}:a]atrim=start=${trimS}:end=${trimE},asetpts=PTS-STARTPTS,volume=${insert.volume || 1.0}[insert_a_${segmentIndex}];`);
          concatLabels.push(`[insert_a_${segmentIndex}]`);
        } else if (insert.inputIndex !== undefined) {
          // Extract audio of the inserted video segment
          const trimS = insert.audioTrimStart || 0;
          const trimE = insert.audioTrimEnd || (insert.endTime - insert.startTime + trimS);
          filterParts.push(`[${insert.inputIndex}:a]atrim=start=${trimS}:end=${trimE},asetpts=PTS-STARTPTS,volume=${insert.volume || 1.0}[insert_a_${segmentIndex}];`);
          concatLabels.push(`[insert_a_${segmentIndex}]`);
        } else {
          // Silence segment during photo/silent insert
          filterParts.push(`anullsrc=r=44100:cl=stereo,atrim=duration=${insert.endTime - insert.startTime},asetpts=PTS-STARTPTS[silence_${segmentIndex}];`);
          concatLabels.push(`[silence_${segmentIndex}]`);
        }
        segmentIndex++;
        offset += (insert.endTime - insert.startTime);
      }

      // Final segment to end
      filterParts.push(`[${primaryAudioLabel}]atrim=start=${currentTemplateTime},asetpts=PTS-STARTPTS[a_seg_${segmentIndex}];`);
      concatLabels.push(`[a_seg_${segmentIndex}]`);
      segmentIndex++;

      // Combine and concat
      filterParts.push(`${concatLabels.join('')}concat=n=${segmentIndex}:v=0:a=1[seq_a]`);
      seqAudioFilter = filterParts.join('');
      primaryAudioLabel = 'seq_a';
    }

    const mixLabels = [];
    let localFilterStr = seqAudioFilter ? (seqAudioFilter + ';') : '';

    // Main template audio
    if (primaryAudioLabel) {
      const v1 = audioOption === 'keep' ? originalVolume : customAudioVolume;
      localFilterStr += `[${primaryAudioLabel}]volume=${v1}[main_a];`;
      mixLabels.push('[main_a]');
    }

    // Background music
    if (bgMusicLabel) {
      localFilterStr += `[${bgMusicLabel}]volume=${bgMusicVolume}[bg_a];`;
      mixLabels.push('[bg_a]');
    }

    // Overlay audios
    sortedOverlays.forEach((overlay, idx) => {
      if (overlay.audioInputIndex !== undefined) {
        const trimS = overlay.audioTrimStart || 0;
        const trimE = overlay.audioTrimEnd || (overlay.endTime - overlay.startTime + trimS);
        const delayMs = Math.round(overlay.startTime * 1000);
        
        localFilterStr += `[${overlay.audioInputIndex}:a]atrim=start=${trimS}:end=${trimE},asetpts=PTS-STARTPTS,volume=${overlay.volume},adelay=${delayMs}|${delayMs}[overlay_a_${idx}];`;
        mixLabels.push(`[overlay_a_${idx}]`);
      } else if (overlay.inputIndex !== undefined) {
        const trimS = overlay.audioTrimStart || 0;
        const trimE = overlay.audioTrimEnd || (overlay.endTime - overlay.startTime + trimS);
        const delayMs = Math.round(overlay.startTime * 1000);
        
        localFilterStr += `[${overlay.inputIndex}:a]atrim=start=${trimS}:end=${trimE},asetpts=PTS-STARTPTS,volume=${overlay.volume},adelay=${delayMs}|${delayMs}[overlay_a_${idx}];`;
        mixLabels.push(`[overlay_a_${idx}]`);
      }
    });

    if (mixLabels.length > 0) {
      if (mixLabels.length === 1) {
        // Remove trailing semicolon
        if (localFilterStr.endsWith(';')) {
          localFilterStr = localFilterStr.slice(0, -1);
        }
        if (mixLabels[0] === '[main_a]') {
          localFilterStr += `;[main_a]anull[a]`;
        } else if (mixLabels[0] === '[bg_a]') {
          localFilterStr += `;[bg_a]anull[a]`;
        } else {
          const idx = mixLabels[0].split('_').pop().replace(']', '');
          localFilterStr += `;[overlay_a_${idx}]anull[a]`;
        }
      } else {
        localFilterStr += `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first[a]`;
      }
      args.push('-filter_complex', localFilterStr);
      args.push('-map', '0:v', '-map', '[a]');
    } else {
      args.push('-map', '0:v');
    }

    // Highly compatible encoding options: H.264 video with yuv420p color mapping, AAC audio
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
    
    if (hasAudio) {
      args.push('-c:a', 'aac');
    }

    if (duration) {
      args.push('-t', String(duration));
    }

    // Output file
    args.push(outputPath);

    console.log('Spawning FFmpeg with command: ffmpeg', args.join(' '));
    const ffmpegProcess = spawn(ffmpegPath, args);

    let stderr = '';
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        console.error('FFmpeg process failed. Stderr:', stderr);
        reject(new Error(`FFmpeg exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error('Failed to start FFmpeg child process:', err);
      reject(err);
    });
  });
};
