import {SCALES,FAMILIES} from './catalog.mjs';

export const COMMON_SCALES=Object.freeze([
 'major','natural-minor','major-pentatonic','minor-pentatonic',
 'major-blues','minor-blues','harmonic-minor','melodic-minor'
]);
const fold=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function initialScaleView(id){
 return COMMON_SCALES.includes(id)?'common':SCALES.find(s=>s.id===id)?.family==='arpeggio'?'arpeggios':'all';
}
// Browsing is independent of the selected scale. Search always spans the catalog.
export function scaleGroups({view='common',search='',lang='en'}={}){
 const words=fold(search).split(/\s+/).filter(Boolean);
 const list=SCALES.filter(s=>{
  if(words.length){const haystack=fold(`${s.name.en} ${s.name.pt} ${s.aliases.join(' ')}`);return words.every(w=>haystack.includes(w));}
  return view==='common'?COMMON_SCALES.includes(s.id):view==='arpeggios'?s.family==='arpeggio':true;
 });
 const common=COMMON_SCALES.map(id=>list.find(s=>s.id===id)).filter(Boolean);
 const groups=common.length?[{id:'common',scales:common}]:[];
 for(const family of Object.keys(FAMILIES)){
  const scales=list.filter(s=>s.family===family&&!COMMON_SCALES.includes(s.id));
  if(scales.length)groups.push({id:family,label:FAMILIES[family][lang],scales});
 }
 return groups;
}
