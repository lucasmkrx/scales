import {selection,TUNINGS} from './music.mjs';

export const GUIDED_BOOKS=Object.freeze([
 {instrument:'guitar',strings:6,tuning:'guitar-c-sharp-standard',lang:'pt',hand:'right',pages:42,file:'guitar-c-sharp-right-pt.pdf'},
 {instrument:'bass',strings:4,tuning:'bass-4-drop-c',lang:'pt',hand:'right',pages:32,file:'bass-drop-c-right-pt.pdf'},
 {instrument:'guitar',strings:6,tuning:'guitar-standard',lang:'en',hand:'left',pages:42,file:'guitar-standard-left-en.pdf'},
 {instrument:'bass',strings:4,tuning:'bass-4-standard',lang:'en',hand:'left',pages:32,file:'bass-standard-left-en.pdf'}
].map(book=>Object.freeze(book)));

export function matchingGuides(input){
 const state=selection(input);
 return GUIDED_BOOKS.filter(book=>{
  if(book.lang!==state.lang||book.instrument!==state.instrument||book.hand!==state.hand||book.strings!==state.strings)return false;
  const tuning=TUNINGS.find(t=>t.id===book.tuning);
  // Compare sounding pitches so equivalent custom tunings match too.
  return tuning.notes.every((pitch,i)=>pitch===state.tuningData.notes[i]);
 });
}
