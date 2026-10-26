import test from 'node:test';
import assert from 'node:assert/strict';
import {scaleGroups,COMMON_SCALES,initialScaleView} from '../src/scale-picker.mjs';
import {SCALES} from '../src/catalog.mjs';
import {boardSvg} from '../src/board.mjs';
const ids=options=>scaleGroups(options).flatMap(g=>g.scales.map(s=>s.id));
test('common scales are a focused starting set, and the full catalog has no duplicates or omissions',()=>{
 assert.deepEqual(ids({}),COMMON_SCALES);assert.ok(COMMON_SCALES.includes('major-pentatonic'));
 const all=ids({view:'all'});assert.equal(all.length,SCALES.length);assert.equal(new Set(all).size,all.length);
 assert.ok(ids({view:'arpeggios'}).every(id=>SCALES.find(s=>s.id===id).family==='arpeggio'));
 assert.equal(ids({view:'arpeggios'}).length,12);
 assert.equal(initialScaleView('dorian'),'all');assert.equal(initialScaleView('minor-triad'),'arpeggios');assert.equal(initialScaleView('custom'),'all');
});
test('search spans all collections, matches both languages and aliases, and ignores accents and word order',()=>{
 assert.ok(ids({search:'dórico',view:'common'}).includes('dorian'));
 assert.ok(ids({search:'pentatonica menor'}).includes('minor-pentatonic'));
 assert.deepEqual(ids({search:'aeolian'}),['natural-minor']);
 assert.deepEqual(ids({search:'something missing'}),[]);
 assert.deepEqual(ids({view:'common',search:'  '}),COMMON_SCALES);
 const settings=Object.freeze({view:'common',search:'minor',lang:'pt',scale:'major'});scaleGroups(settings);assert.equal(settings.scale,'major');
});
test('seven-string note circles retain separation in full and position maps',()=>{
 for(const hand of ['left','right'])for(const opts of [{},{small:true,width:400,height:190,lo:0,hi:4}]){
  const svg=boardSvg({instrument:'guitar',strings:7,tuning:'guitar-7-standard',scale:'chromatic',hand},opts);
  const circles=[...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)].map(m=>({x:+m[1],y:+m[2],r:+m[3]}));
  const groups=new Map();for(const c of circles){const key=`${c.x},${c.y}`;if(!groups.has(key)||groups.get(key).r<c.r)groups.set(key,c);}
  const notes=[...groups.values()];assert.equal(new Set(notes.map(c=>c.y)).size,7);
  for(const a of notes)for(const b of notes)if(a.x===b.x&&a.y<b.y)assert.ok(b.y-a.y>a.r+b.r,'circles on neighboring strings overlap');
 }
});

test('SVG open-string labels honor explicit spelling and tuning defaults in both layouts',()=>{
 const state={instrument:'guitar',strings:6,tuning:'guitar-eb-standard',scale:'natural-minor',root:0};
 for(const hand of ['left','right'])for(const small of [false,true]){
  const sharp=boardSvg({...state,hand,spelling:'sharp'},{small});
  const flat=boardSvg({...state,hand,spelling:'flat'},{small});
  const auto=boardSvg({...state,hand,spelling:'auto'},{small});
  assert.match(sharp,/>D♯<\/text>/);assert.doesNotMatch(sharp,/>E♭<\/text>/);
  assert.match(flat,/>E♭<\/text>/);assert.doesNotMatch(flat,/>D♯<\/text>/);
  assert.match(auto,/>E♭<\/text>/);
 }
});
