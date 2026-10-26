import { SCALES,TUNINGS,mod } from './catalog.mjs';
export { SCALES,TUNINGS,mod };
export const PALETTE={0:'#cf3039',2:'#ed7d1a',4:'#f7d038',5:'#16834b',7:'#1b6fc2',9:'#5852bc',11:'#963dbc'};
export const SHARPS=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const FLATS=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export const DEFAULT_FRETS={guitar:21,bass:20};
export const DEFAULTS={instrument:'guitar',strings:6,tuning:'guitar-standard',hand:'right',lang:'en',root:0,spelling:'auto',scale:'major',frets:DEFAULT_FRETS.guitar,labels:'notes',allNotes:false};
export const prettyDegree=s=>s.replaceAll('b','♭').replaceAll('#','♯');
export const noteName=(pc,preference='sharp')=>(preference==='flat'?FLATS:SHARPS)[mod(pc)];
export const midiName=(midi,prefer='sharp')=>`${noteName(midi,prefer)}${Math.floor(midi/12)-1}`;
export function parseNote(value){
 const m=/^([A-Ga-g])([#♯b♭]{0,2})(-?\d)$/.exec(value.trim());
 if(!m)throw new Error(`Invalid note: ${value}`);
 const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()];
 const offset=[...m[2]].reduce((v,s)=>v+(s==='#'||s==='♯'?1:-1),0);const midi=(Number(m[3])+1)*12+natural+offset;
 if(midi<0||midi>127)throw new Error('Pitch out of range');return midi;
}
export function parseTuning(text,strings){
 const notes=text.trim().split(/[\s,;]+/).map(parseNote);
 if(notes.length!==strings)throw new Error(`Expected ${strings} notes`);
 if(notes.some((m,i)=>i&&m<=notes[i-1]))throw new Error('Enter notes from lowest to highest pitch');return notes;
}
export function parseFormula(value){
 const formula=value.trim().replaceAll('♭','b').replaceAll('♯','#').split(/[\s,;]+/);
 const intervals=formula.map(d=>{const m=/^([b#]{0,2})([1-7])$/.exec(d);if(!m)throw new Error('Use degrees such as 1 2 b3 4 5 b6 b7');return mod([0,2,4,5,7,9,11][Number(m[2])-1]+[...m[1]].reduce((n,a)=>n+(a==='#'?1:-1),0));});
 if(formula[0]!=='1'||new Set(intervals).size!==intervals.length||intervals.some((n,i)=>i&&n<=intervals[i-1]))throw new Error('Start with 1 and list distinct degrees in ascending pitch order');
 return {id:'custom',name:{en:'Custom scale',pt:'Escala personalizada'},family:'custom',intervals,formula};
}
export function normalizeState(input={}){
 const s={...DEFAULTS,...input};s.instrument=s.instrument==='bass'?'bass':'guitar';
 const counts=s.instrument==='guitar'?[6,7]:[4,5,6];s.strings=counts.includes(Number(input.strings))?Number(input.strings):counts[0];
 s.lang=s.lang==='pt'?'pt':'en';s.hand=s.hand==='left'?'left':'right';s.labels=s.labels==='degrees'?'degrees':'notes';s.spelling=['auto','sharp','flat'].includes(s.spelling)?s.spelling:'auto';
 s.root=Number(s.root);if(!Number.isInteger(s.root)||s.root<0||s.root>11)s.root=0;
 s.frets=[20,21,22,24].includes(Number(input.frets))?Number(input.frets):DEFAULT_FRETS[s.instrument];
 s.allNotes=s.allNotes===true||s.allNotes==='true';
 if(s.tuning==='custom'){
  try{s.customNotes=parseTuning(s.customTuning??'',s.strings);}catch{s.tuning='';delete s.customNotes;}
 }
 if(s.tuning!=='custom'&&!TUNINGS.some(t=>t.id===s.tuning&&t.instrument===s.instrument&&t.strings===s.strings))s.tuning=TUNINGS.find(t=>t.instrument===s.instrument&&t.strings===s.strings).id;
 if(s.scale==='custom'){try{parseFormula(s.formula??'');}catch{s.scale='major';}}
 if(s.scale!=='custom'&&!SCALES.some(t=>t.id===s.scale))s.scale='major';return s;
}
export function selection(input){const s=normalizeState(input);const tuning=s.tuning==='custom'?{id:'custom',name:s.lang==='pt'?'Personalizada':'Custom',notes:s.customNotes,instrument:s.instrument,strings:s.strings,preferred:'sharp'}:TUNINGS.find(t=>t.id===s.tuning);const scale=s.scale==='custom'?parseFormula(s.formula):SCALES.find(t=>t.id===s.scale);return {...s,tuningData:tuning,scaleData:scale};}
export function rootName(state){const prefer=state.spelling==='auto'?([1,3,8,10].includes(state.root)?'flat':'sharp'):state.spelling;return noteName(state.root,prefer);}
export function pitchPreference(input){const state=input.tuningData?input:selection(input);return state.spelling==='auto'?state.tuningData.preferred:state.spelling;}
export function spellScale(input){
 const state=input.scaleData?input:selection(input);const scale=state.scaleData;const root=rootName(state);const letter=root[0];const letters=['C','D','E','F','G','A','B'];const natural=[0,2,4,5,7,9,11];
 // Explicit display choices apply to every pitch; automatic retains degree-based spelling.
 if(state.spelling!=='auto')return scale.intervals.map(interval=>noteName(state.root+interval,state.spelling));
 return scale.formula.map((degree,i)=>{const number=Number(degree.at(-1));const letterIndex=mod(letters.indexOf(letter)+number-1,7);const pitch=mod(state.root+scale.intervals[i]);let accidental=mod(pitch-natural[letterIndex]);if(accidental>6)accidental-=12;return letters[letterIndex]+(accidental<0?'♭'.repeat(-accidental):'♯'.repeat(accidental));});
}
export function fretFill(fret){if(fret===0)return '#eff3f5';if(fret%12===0)return '#dde6ed';if([3,5,7,9].includes(fret%12))return '#e8eef3';return fret>=12?'#f0f4f7':'#fafbfc';}
export function boardModel(input,{lo=0,hi,all=false}={}){
 const s=selection(input);hi=hi??s.frets;const rows=[...s.tuningData.notes].reverse();const spellings=spellScale(s);const points=[];
 rows.forEach((open,row)=>{for(let fret=lo;fret<=hi;fret++){const midi=open+fret;const pc=mod(midi);const index=s.scaleData.intervals.indexOf(mod(pc-s.root));if(index<0&&!all&&!s.allNotes)continue;points.push({row,string:row+1,fret,midi,pc,root:pc===s.root,inScale:index>=0,name:index>=0?spellings[index]:noteName(pc,pitchPreference(s)),degree:index>=0?prettyDegree(s.scaleData.formula[index]):'',fill:PALETTE[pc]??'#ffffff',lightText:[0,5,7,9,11].includes(pc),active:index>=0});}});
 return {state:s,rows,lo,hi,points};
}
export function layoutBoard(model,{width=1100,height=270,small=false}={}){
 const {lo,hi,rows,state}=model;const margin=small?22:40;const labelMargin=small?26:48;const left=state.hand==='left'?margin:labelMargin;const right=state.hand==='left'?width-labelMargin:width-margin;const top=small?25:35;const bottom=height-(small?25:42);const start=left+(lo===0?28:0);const count=hi-Math.max(1,lo)+1;
 // Real equal-tempered fret spacing; mirror geometry, never the text or row order.
 const ratios=Array.from({length:Math.max(0,count)+1},(_,i)=>1-2**(-i/12));const denominator=ratios.at(-1)||1;
 const rawBound=i=>start+(right-start)*ratios[i]/denominator;
 const mirror=x=>state.hand==='left'?left+right-x:x;
 const center=f=>mirror(f===0?left+12:(rawBound(f-Math.max(1,lo))+rawBound(f-Math.max(1,lo)+1))/2);
 const y=row=>top+(bottom-top)*(rows.length===1?.5:row/(rows.length-1));
 const edges=f=>{const a=f===0?left:rawBound(f-Math.max(1,lo));const z=f===0?start:rawBound(f-Math.max(1,lo)+1);return [Math.min(mirror(a),mirror(z)),Math.max(mirror(a),mirror(z))];};
 return {width,height,left,right,top,bottom,center,y,edges,nut:lo===0?mirror(start):null,labelX:state.hand==='left'?right+20:left-20};
}
export function scaleMidiSequence(input){const s=selection(input);const lowest=s.tuningData.notes[0];const root=lowest+mod(s.root-lowest);const up=s.scaleData.intervals.map(i=>root+i).concat(root+12);return up.concat(up.slice(0,-1).reverse());}
export function sharedState(s){const clean=normalizeState(s);const params=new URLSearchParams();for(const k of Object.keys(DEFAULTS))params.set(k,String(clean[k]));if(clean.tuning==='custom')params.set('customTuning',clean.customTuning);if(clean.scale==='custom')params.set('formula',clean.formula);return params.toString();}
