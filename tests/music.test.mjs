import test from 'node:test';import assert from 'node:assert/strict';
import {SCALES,TUNINGS,parseFormula,parseNote,parseTuning,selection,spellScale,boardModel,layoutBoard,normalizeState,scaleMidiSequence,sharedState} from '../src/music.mjs';import {mode} from '../src/catalog.mjs';
test('every named scale has unique ascending intervals consistent with its degree formula',()=>{
 assert.equal(new Set(SCALES.map(s=>s.id)).size,SCALES.length);
 for(const scale of SCALES){assert.deepEqual(parseFormula(scale.formula.join(' ')).intervals,scale.intervals,scale.id);assert.equal(scale.intervals[0],0);assert.equal(new Set(scale.intervals).size,scale.intervals.length);}
});
test('modes are rotated interval structures, not merely renamed roots',()=>{assert.deepEqual(mode([0,2,4,5,7,9,11],1),[0,2,3,5,7,9,10]);assert.deepEqual(mode([0,2,3,5,7,8,11],4),[0,1,4,5,7,8,10]);});
test('enharmonic spelling preserves scale degrees including E-sharp and C-flat',()=>{
 assert.deepEqual(spellScale(selection({root:6,spelling:'sharp',scale:'major'})),['F♯','G♯','A♯','B','C♯','D♯','E♯']);
 assert.deepEqual(spellScale(selection({root:8,spelling:'flat',scale:'natural-minor'})),['A♭','B♭','C♭','D♭','E♭','F♭','G♭']);
 for(const s of SCALES)for(let root=0;root<12;root++){const state=selection({scale:s.id,root});spellScale(state).forEach((n,i)=>assert.equal(parseNote(`${n}4`)%12,(root+s.intervals[i])%12,`${s.id} ${root} ${n}`));}
});
test('standard, drop, and extended-range tuning pitches include their real octaves',()=>{
 const get=id=>TUNINGS.find(t=>t.id===id).notes;
 assert.deepEqual(get('guitar-standard'),[40,45,50,55,59,64]);assert.deepEqual(get('guitar-drop-c'),[36,43,48,53,57,62]);
 assert.deepEqual(get('bass-4-drop-c'),[24,31,36,41]);assert.deepEqual(get('bass-5-standard'),[23,28,33,38,43]);assert.deepEqual(get('bass-6-standard'),[23,28,33,38,43,48]);
 for(const t of TUNINGS){assert.equal(t.notes.length,t.strings);assert.ok(t.notes.every((m,i)=>!i||m>t.notes[i-1]));}
});
test('fretboard notes sound correctly for every tuning, scale, key, and handedness',()=>{
 for(const tuning of TUNINGS)for(const scale of SCALES)for(let root=0;root<12;root++){
  const params={instrument:tuning.instrument,strings:tuning.strings,tuning:tuning.id,scale:scale.id,root,frets:24};const m=boardModel(params);
  assert.equal(m.rows.length,tuning.strings);for(const p of m.points){assert.equal(p.midi,m.rows[p.row]+p.fret);assert.equal(p.pc,p.midi%12);assert.ok(scale.intervals.includes((p.pc-root+12)%12));assert.equal(p.root,p.pc===root);}
  const right=layoutBoard(m),left=layoutBoard(boardModel({...params,hand:'left'}));assert.ok(right.center(1)<right.center(12));assert.ok(left.center(1)>left.center(12));assert.equal(right.y(0),left.y(0));
  assert.equal(Math.round(right.center(5)+left.center(5)),1100);
 }
});
test('custom inputs reject missing roots, duplicate pitches, invalid registers, and bad ordering',()=>{
 assert.deepEqual(parseTuning('C1 G1 C2 F2',4),[24,31,36,41]);assert.deepEqual(parseFormula('1 2 ♭3 4 5 ♭6 ♭7').intervals,[0,2,3,5,7,8,10]);
 for(const v of ['2 3 5','1 #2 b3','1 5 3','1 9'])assert.throws(()=>parseFormula(v));
 assert.throws(()=>parseTuning('E1 A1 D2',4));assert.throws(()=>parseTuning('G2 D2 A1 E1',4));assert.throws(()=>parseNote('H4'));
});
test('URL state round-trips custom configurations and malformed parameters fall back safely',()=>{
 const s=normalizeState({instrument:'bass',strings:6,tuning:'custom',customTuning:'A0 E1 A1 D2 G2 C3',scale:'custom',formula:'1 b2 3 4 5 b6 7',lang:'pt',hand:'left',root:6});assert.equal(s.tuning,'custom');
 const restored=normalizeState(Object.fromEntries(new URLSearchParams(sharedState(s))));assert.equal(restored.customTuning,s.customTuning);assert.equal(restored.formula,s.formula);assert.deepEqual(boardModel(restored).points,boardModel(s).points);
 const bad=normalizeState({root:'oops',frets:'-10',strings:100,instrument:'bass',scale:'unknown',tuning:'../evil'});assert.equal(bad.root,0);assert.equal(bad.frets,20);assert.equal(bad.strings,4);assert.equal(bad.tuning,'bass-4-standard');
});
test('audio starts on a playable root, reaches its octave, and returns to the root',()=>{
 for(const t of TUNINGS){const sequence=scaleMidiSequence({instrument:t.instrument,strings:t.strings,tuning:t.id,root:1,scale:'major'});assert.ok(sequence[0]>=t.notes[0]);assert.equal(sequence[0]%12,1);assert.equal(sequence[7],sequence[0]+12);assert.equal(sequence.at(-1),sequence[0]);}
});

test('seven-string presets, custom tuning, and share links retain all seven strings',()=>{
 const standard=selection({instrument:'guitar',strings:7});
 assert.equal(standard.tuning,'guitar-7-standard');assert.deepEqual(standard.tuningData.notes,[35,40,45,50,55,59,64]);
 const drop=selection({instrument:'guitar',strings:7,tuning:'guitar-7-drop-a'});
 assert.deepEqual(drop.tuningData.notes,[33,40,45,50,55,59,64]);
 const custom=normalizeState({instrument:'guitar',strings:7,tuning:'custom',customTuning:'G1 D2 G2 C3 F3 A3 D4',hand:'left',root:7,scale:'minor-pentatonic'});
 assert.equal(custom.tuning,'custom');assert.deepEqual(custom.customNotes,[31,38,43,48,53,57,62]);
 assert.deepEqual(normalizeState(Object.fromEntries(new URLSearchParams(sharedState(custom)))),custom);
 assert.equal(normalizeState({strings:8}).strings,6);assert.equal(normalizeState({instrument:'bass',strings:7}).strings,4);
});


test('fret defaults follow the instrument while explicit selections and shared links are preserved',()=>{
 assert.equal(normalizeState().frets,21);
 assert.equal(normalizeState({instrument:'guitar',strings:7}).frets,21);
 assert.equal(normalizeState({instrument:'bass'}).frets,20);
 assert.equal(normalizeState({instrument:'bass',strings:6}).frets,20);
 for(const instrument of ['guitar','bass'])for(const frets of [20,21,22,24]){
  const selected=normalizeState({instrument,frets});assert.equal(selected.frets,frets);
  assert.equal(normalizeState(Object.fromEntries(new URLSearchParams(sharedState(selected)))).frets,frets);
 }
 assert.equal(normalizeState({instrument:'guitar',frets:'invalid'}).frets,21);
 assert.equal(normalizeState({instrument:'bass',frets:'invalid'}).frets,20);
});
