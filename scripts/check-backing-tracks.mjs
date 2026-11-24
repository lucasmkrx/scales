// SPDX-License-Identifier: MPL-2.0

import { setTimeout as delay } from 'node:timers/promises';
import { backingCatalog, rootDrones } from '../src/backing-track-catalog.mjs';

// Run explicitly when maintaining the catalog. Normal builds and tests work offline.
const recordings = [
  ...backingCatalog,
  ...rootDrones.map((videoId) => ({ videoId, creator: 'BoneZone Studio' })),
];

async function checkRecording({ videoId, creator }) {
  const endpoint = new URL('https://www.youtube.com/oembed');
  endpoint.search = new URLSearchParams({
    format: 'json',
    url: `https://www.youtube.com/watch?v=${videoId}`,
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
      if (response.status === 429 || response.status >= 500) {
        await response.body?.cancel();
        throw new Error(`YouTube returned HTTP ${response.status}`);
      }
      if (!response.ok) {
        await response.body?.cancel();
        return `HTTP ${response.status}`;
      }
      const video = await response.json();
      if (video.type !== 'video' || !video.html?.includes(`/embed/${videoId}`))
        return 'No matching embedded video';
      if (video.author_name?.trim() !== creator.trim())
        return `Check creator credit (YouTube lists "${video.author_name}")`;
      return;
    } catch (error) {
      if (attempt === 2) return error.message;
      await delay(1000 * 2 ** attempt);
    }
  }
}

const queue = recordings.values();
let issues = 0;
async function checkQueue() {
  for (const recording of queue) {
    const issue = await checkRecording(recording);
    if (issue) {
      issues++;
      console.error(`${recording.videoId} (${recording.creator}): ${issue}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, checkQueue));
console.log(`Checked ${recordings.length} YouTube embeds. ${issues} need review.`);
process.exitCode = issues ? 1 : 0;
