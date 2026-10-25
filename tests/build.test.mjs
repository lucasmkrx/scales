import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('published assets use one revision across the entry point, module graph, and styles',async()=>{
 await import('../scripts/build.mjs');
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const version=html.match(/src\/app\.mjs\?v=([a-f0-9]{12})/)[1];
 assert.ok(html.includes(`styles.css?v=${version}`));
 for(const name of await readdir(new URL('../dist/src/',import.meta.url))){
  const source=await readFile(new URL(`../dist/src/${name}`,import.meta.url),'utf8');
  for(const match of source.matchAll(/['"]\.\/[^'"]+\.mjs([^'"]*)['"]/g))assert.equal(match[1],`?v=${version}`,name);
 }
 const published=await import(`../dist/src/music.mjs?v=${version}`);
 assert.equal(published.normalizeState().frets,21);
 assert.equal(published.normalizeState({instrument:'bass'}).frets,20);
});
