import test from 'node:test';
import assert from 'node:assert/strict';
import {guideBoardLayout,bassRoute,guidePlan} from '../src/guide-layout.mjs';
import {selection,TUNINGS,SCALES} from '../src/music.mjs';

test('guided-book geometry mirrors frets, fans strings continuously, and keeps every note inside the neck',()=>{
 for(const instrument of ['guitar','bass'])for(const strings of instrument==='guitar'?[6,7]:[4,5,6])for(const frets of [20,21,22,24])for(const small of [false,true]){
  const args={instrument,strings,frets},options={small,...(small?{width:142,height:82,lo:0,hi:4}:{})};
  const r=guideBoardLayout(args,options),l=guideBoardLayout({...args,hand:'left'},options);
  for(let f=0;f<=(small?4:frets);f++)for(let row=0;row<strings;row++){
   assert.ok(Math.abs(r.center(f)+l.center(f)-(2*r.x+r.width))<1e-8);
   assert.equal(r.y(row,f),l.y(row,f));
   assert.ok(r.y(row,f)>r.edgeY(r.center(f))&&r.y(row,f)<r.edgeY(r.center(f),true));
   assert.equal(r.y(row,f),r.stringY(row,r.center(f)));
  }
  if(!small){assert.ok(r.edgeY(r.end)<r.edgeY(r.nut));assert.ok(r.edgeY(r.end,true)>r.edgeY(r.nut,true));}
 }
 const mini=guideBoardLayout({instrument:'bass',strings:6},{width:214,height:54});assert.ok(mini.rowGap>4.8);
});
test('bass octave routes contain the selected scale in pitch order for every tuning and key',()=>{
 const verify=(args,row)=>{
  const s=selection(args),route=bassRoute(s,row),notes=[...s.tuningData.notes].reverse();
  assert.equal(route.points[0].row,row);assert.equal(route.points[0].midi%12,s.root);
  assert.deepEqual(route.points.map(p=>p.midi-route.points[0].midi),s.scaleData.intervals.concat(12));
  route.points.forEach((p,i)=>{assert.equal(notes[p.row]+p.fret,p.midi);assert.ok(p.fret>=0&&p.fret<=s.frets);if(i)assert.ok(p.row<=route.points[i-1].row);});
  assert.equal(route.points.at(-1).midi-route.points[0].midi,12);
 };
 for(const tuning of TUNINGS.filter(t=>t.instrument==='bass'))for(let root=0;root<12;root++)for(const row of [tuning.strings-1,tuning.strings-2])verify({instrument:'bass',strings:tuning.strings,tuning:tuning.id,root,scale:'minor-pentatonic'},row);
 for(const scale of SCALES)for(const row of [3,2])verify({instrument:'bass',root:9,scale:scale.id},row);
});
test('a custom tuning with no reachable octave returns a position-map fallback',()=>{
 assert.equal(bassRoute({instrument:'bass',tuning:'custom',customTuning:'C0 C4 C5 C6',strings:4,frets:20,root:11},3),null);
});
test('contents planning paginates a full catalog without losing titles or destinations',()=>{
 const titles={coverTitle:'Cover',readTitle:'Read',contentsTitle:'Contents'};
 for(const count of [1,7,12,30,31,67,120]){
  const variants=Array.from({length:count},(_,i)=>({title:`Scale ${i}`})),plan=guidePlan(variants,titles);
  assert.equal(plan.entries.length,count+2+plan.extra);
  assert.equal(plan.entries[plan.readingPage-1].type,'reading');
  assert.equal(plan.entries[plan.firstScalePage-1].type,'scale');
  assert.deepEqual(plan.entries.filter(e=>e.type==='scale').map(e=>e.title),variants.map(s=>s.title));
  assert.ok(plan.entries.length<=32+48*plan.extra);
  assert.deepEqual(plan.entries.map(e=>e.number),Array.from({length:plan.entries.length},(_,i)=>i+1));
 }
});
