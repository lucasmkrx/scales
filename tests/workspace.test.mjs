import test from 'node:test';
import assert from 'node:assert/strict';
import {selection,SCALES} from '../src/music.mjs';
import {restoreWorkspace,rememberWorkspace,readPreferences,changeSetup,exportPreview,scaleName} from '../src/workspace.mjs';

test('instrument and string setups are recalled without changing the selected music',()=>{
 let state=restoreWorkspace({instrument:'guitar',strings:7,tuning:'guitar-7-drop-a',hand:'left',frets:24,root:9,scale:'natural-minor'});
 let saved=rememberWorkspace({},state);
 state=changeSetup(state,{instrument:'bass'},saved);
 assert.equal(state.strings,4);assert.equal(state.frets,20);assert.equal(state.hand,'left');assert.equal(state.root,9);assert.equal(state.scale,'natural-minor');
 state=changeSetup(state,{tuning:'bass-4-drop-c'},saved);saved=rememberWorkspace(saved,state);
 state=changeSetup(state,{instrument:'guitar'},saved);
 assert.equal(state.strings,7);assert.equal(state.tuning,'guitar-7-drop-a');assert.equal(state.frets,24);
 state=changeSetup(state,{strings:6},saved);assert.equal(state.tuning,'guitar-standard');
 state=changeSetup(state,{strings:7},saved);assert.equal(state.tuning,'guitar-7-drop-a');
 state=changeSetup(state,{instrument:'bass'},saved);assert.equal(state.tuning,'bass-4-drop-c');
});
test('saved preferences survive reload, while shared links override remembered configuration',()=>{
 const saved=rememberWorkspace({},restoreWorkspace({instrument:'bass',strings:6,tuning:'bass-6-standard',lang:'pt',labels:'degrees',spelling:'flat',frets:24}));
 const decoded=readPreferences(JSON.stringify(saved));
 assert.equal(restoreWorkspace({},decoded).instrument,'bass');assert.equal(restoreWorkspace({},decoded).strings,6);
 const linked=restoreWorkspace({instrument:'guitar',strings:'6',tuning:'guitar-standard',lang:'en',hand:'left',frets:'21',labels:'notes',spelling:'both'},decoded);
 assert.equal(linked.instrument,'guitar');assert.equal(linked.strings,6);assert.equal(linked.lang,'en');assert.equal(linked.frets,21);assert.equal(linked.spelling,'both');
 for(const raw of [null,'not json','null','{"version":2}','[]'])assert.deepEqual(readPreferences(raw),{});
});
test('custom tuning pitches are remembered for their own instrument and string count',()=>{
 const original=restoreWorkspace({instrument:'bass',strings:4,tuning:'custom',customTuning:'C1 G1 C2 F2'}),saved=rememberWorkspace({},original);
 const other=changeSetup(original,{strings:5},saved);assert.notEqual(other.tuning,'custom');
 const recalled=changeSetup(other,{strings:4},saved);assert.deepEqual(selection(recalled).tuningData.notes,[24,31,36,41]);
});
test('export estimates include covers, reading pages, and additional contents pages',()=>{
 assert.deepEqual(exportPreview({scale:'major'}),{count:1,pages:3});
 assert.deepEqual(exportPreview({scale:'major'},{allKeys:true}),{count:12,pages:14});
 assert.deepEqual(exportPreview({scale:'major'},{scope:'family',allKeys:true}),{count:7,pages:9});
 assert.deepEqual(exportPreview({scale:'major'},{scope:'catalog'}),{count:SCALES.length,pages:70});
 assert.deepEqual(exportPreview({scale:'custom',formula:'1 b3 5'},{scope:'family'}),{count:0,pages:0});
});
test('simple scale names retain qualifications that distinguish different scales',()=>{
 assert.equal(scaleName(SCALES.find(s=>s.id==='natural-minor')),'Natural minor');
 assert.equal(scaleName(SCALES.find(s=>s.id==='diminished-wh')),'Diminished (whole-half)');
 assert.equal(scaleName(SCALES.find(s=>s.id==='diminished-hw')),'Diminished (half-whole)');
 assert.match(scaleName(SCALES.find(s=>s.id==='pelog')),/approximation/);
});
