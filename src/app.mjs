import {SCALES,TUNINGS,selection,normalizeState,rootName,spellScale,prettyDegree,midiName,PALETTE,SHARPS,FLATS,parseTuning,parseFormula,sharedState,scaleMidiSequence} from './music.mjs';
import {scaleGroups,initialScaleView} from './scale-picker.mjs';
import {FAMILIES} from './catalog.mjs';import {copy} from './i18n.mjs';import {boardSvg,escape} from './board.mjs';import {createAtlas} from './pdf.mjs';
let state=normalizeState(Object.fromEntries(new URLSearchParams(location.search)));let view=initialScaleView(state.scale);let search='';let audio;let oscillators=[];let playTimer;let exporting;let pdfLibraries;
const $=id=>document.getElementById(id);const options=(items,current)=>items.map(([value,label])=>`<option value="${escape(value)}" ${String(value)===String(current)?'selected':''}>${escape(label)}</option>`).join('');
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function saveURL(){history.replaceState(null,'',`${location.pathname}?${sharedState(state)}`);}
function renderScalePicker(){
 const scroll=$('scale-results').scrollTop;const t=copy[state.lang],groups=scaleGroups({view,search,lang:state.lang});
 $('scale-tabs').setAttribute('aria-label',t.collections);
 $('scale-results').setAttribute('aria-label',t.scale);
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 $('scale-results-count').textContent=`${groups.reduce((n,g)=>n+g.scales.length,0)} ${t.results}`;
 $('scale-results').innerHTML=groups.length?groups.map(group=>`<div class="scale-group"><h3>${escape(group.id==='common'?t.commonScales:group.label)}</h3>${group.scales.map(scale=>`<button type="button" class="scale-choice" data-scale="${scale.id}" aria-pressed="${state.scale===scale.id}"><span>${escape(scale.name[state.lang])}</span><small>${scale.intervals.length} ${t.noteCount} · ${scale.formula.map(prettyDegree).join(' ')}</small></button>`).join('')}</div>`).join(''):`<p class="empty-results">${t.noResults}</p>`;
 $('scale-results').scrollTop=scroll;
 const selected=selection(state).scaleData;
 $('scale-selection').textContent=`${t.currentScale}: ${rootName(state)} ${selected.name[state.lang]}`;
 $('create-scale').setAttribute('aria-expanded',String(!$('custom-scale').hidden));
}
function bookCards(){const t=copy[state.lang];const guides=[
 ['guitar','C♯ standard','pt','right',42,'guitar-c-sharp-right-pt.pdf'],['bass','Drop C','pt','right',32,'bass-drop-c-right-pt.pdf'],
 ['guitar','E standard','en','left',42,'guitar-standard-left-en.pdf'],['bass','E standard','en','left',32,'bass-standard-left-en.pdf']];
 $('books-grid').innerHTML=guides.map(([instrument,tuning,lang,hand,pages,file])=>`<article class="book"><p class="eyebrow">${t[lang]} · ${t[hand]}</p><h3>${t[instrument]}</h3><p>${tuning}<br>${pages} ${state.lang==='pt'?'páginas':'pages'} · A4</p><a href="./guides/${file}" download>${t.download} PDF ↗</a></article>`).join('');}
function renderContent(){const s=selection(state),t=copy[state.lang],names=spellScale(s);$('family-label').textContent=FAMILIES[s.scaleData.family]?.[s.lang]??t.custom;$('scale-title').textContent=`${rootName(s)} ${s.scaleData.name[s.lang]}`;
 $('notes-strip').innerHTML=names.map((name,i)=>`<span class="note-chip"><span class="color-dot" style="background:${PALETTE[(s.root+s.scaleData.intervals[i])%12]??'#fff'}"></span>${escape(name)}<small>${prettyDegree(s.scaleData.formula[i])}</small></span>`).join('');
 $('tuning-description').innerHTML=`${t.openStrings}<strong>${s.tuningData.notes.map(m=>midiName(m,s.tuningData.preferred)).join(' - ')}</strong>`;$('orientation').textContent=s.hand==='left'?t.nutRight:t.nutLeft;$('board').innerHTML=boardSvg(s);$('board').scrollLeft=s.hand==='left'?$('board').scrollWidth-$('board').clientWidth:0;
 $('positions').innerHTML=[[0,4],[3,7],[5,9],[8,12]].map(([lo,hi])=>`<article class="position"><h3>${t.range} ${lo}-${hi}</h3>${boardSvg({...s,allNotes:false},{lo,hi,width:400,height:s.strings===7?190:170,small:true})}</article>`).join('');saveURL();}
function render(){const t=copy[state.lang];document.documentElement.lang=state.lang==='pt'?'pt-BR':'en-US';document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]??el.textContent;});$('language').value=state.lang;$('search').placeholder=t.searchPlaceholder;
 $('stats').innerHTML=`<strong>${SCALES.length}</strong> ${t.catalog}<br><strong>${TUNINGS.length}</strong> ${t.tunings}`;
 $('strings').innerHTML=options((state.instrument==='guitar'?[6,7]:[4,5,6]).map(n=>[n,n]),state.strings);
 for(const id of ['instrument','hand','frets','root','spelling','labels'])$(id).value=String(state[id]);
 $('tuning').innerHTML=options([...TUNINGS.filter(v=>v.instrument===state.instrument&&v.strings===state.strings).map(v=>[v.id,v.name]),['custom',t.custom]],state.tuning);
 $('root').innerHTML=options(Array.from({length:12},(_,i)=>[i,SHARPS[i]===FLATS[i]?SHARPS[i]:`${SHARPS[i]} / ${FLATS[i]}`]),state.root);
 $('allNotes').checked=state.allNotes;
 $('custom-tuning').hidden=state.tuning!=='custom';$('tuning-input').value=state.customTuning??'';$('tuning-input').placeholder=selection(state).tuningData.notes.map(m=>midiName(m)).join(' ');$('custom-scale').hidden=state.scale!=='custom';$('formula-input').value=state.formula??'1 2 b3 4 5 b6 b7';
 renderScalePicker();bookCards();renderContent();}
function update(values){stopAudio();state=normalizeState({...state,...values});status('');render();}
for(const id of ['instrument','strings','hand','frets','root','spelling','labels'])$(id).addEventListener('change',()=>update({[id]:$(id).value,...(id==='instrument'?{strings:$('instrument').value==='bass'?4:6}:{})}));
function applyTuning(){try{parseTuning($('tuning-input').value,state.strings);update({tuning:'custom',customTuning:$('tuning-input').value});}catch{status(copy[state.lang].tuningExample,true);}}
function applyScale(){try{parseFormula($('formula-input').value);update({scale:'custom',formula:$('formula-input').value});}catch{status(copy[state.lang].formulaHint,true);}}
function audioContext(){audio??=new (window.AudioContext||window.webkitAudioContext)();return audio.resume().then(()=>audio);}
function stopAudio(){oscillators.forEach(o=>{try{o.stop();}catch{}});oscillators=[];clearTimeout(playTimer);$('play').textContent=copy[state.lang].play;$('play').classList.remove('playing');}
async function sound(midi,when,duration){const ac=await audioContext();const o=ac.createOscillator(),gain=ac.createGain();o.type='triangle';o.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(.12,when+.02);gain.gain.setValueAtTime(.10,when+duration*.7);gain.gain.exponentialRampToValueAtTime(.001,when+duration);o.connect(gain);gain.connect(ac.destination);o.start(when);o.stop(when+duration+.02);oscillators.push(o);}
async function playNote(midi){stopAudio();const ac=await audioContext();$('play').textContent=copy[state.lang].stop;$('play').classList.add('playing');await sound(midi,ac.currentTime+.02,.5);playTimer=setTimeout(stopAudio,560);}
$('play').addEventListener('click',async()=>{if(oscillators.length){stopAudio();return;}try{const ac=await audioContext();const notes=scaleMidiSequence(state);$('play').textContent=copy[state.lang].stop;$('play').classList.add('playing');for(let i=0;i<notes.length;i++)await sound(notes[i],ac.currentTime+.03+i*.36,.30);playTimer=setTimeout(stopAudio,notes.length*360+300);}catch{status('Audio is not available in this browser.',true);}});
for(const id of ['board','positions']){const el=$(id);el.addEventListener('click',event=>{const note=event.target.closest('[data-midi]');if(note)playNote(Number(note.dataset.midi));});el.addEventListener('keydown',event=>{const note=event.target.closest('[data-midi]');if(note&&['Enter',' '].includes(event.key)){event.preventDefault();playNote(Number(note.dataset.midi));}});}
$('tuning').addEventListener('change',()=>{if($('tuning').value==='custom'){$('custom-tuning').hidden=false;$('tuning-input').focus();}else update({tuning:$('tuning').value});});
$('scale-results').addEventListener('click',event=>{const button=event.target.closest('[data-scale]');if(button){const id=button.dataset.scale;update({scale:id});$('scale-results').querySelector(`[data-scale="${id}"]`)?.focus({preventScroll:true});}});
$('scale-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button){view=button.dataset.view;search='';$('search').value='';renderScalePicker();$('scale-results').scrollTop=0;}});
$('create-scale').addEventListener('click',()=>{$('custom-scale').hidden=!$('custom-scale').hidden;$('create-scale').setAttribute('aria-expanded',String(!$('custom-scale').hidden));if(!$('custom-scale').hidden)$('formula-input').focus();});
$('apply-tuning').addEventListener('click',applyTuning);$('apply-scale').addEventListener('click',applyScale);$('settings-form').addEventListener('submit',e=>e.preventDefault());
$('search').addEventListener('input',()=>{search=$('search').value;renderScalePicker();$('scale-results').scrollTop=0;});
$('language').addEventListener('change',()=>{update({lang:$('language').value});});$('allNotes').addEventListener('change',()=>update({allNotes:$('allNotes').checked}));
$('share').addEventListener('click',async()=>{saveURL();try{await navigator.clipboard.writeText(location.href);status(copy[state.lang].saved);}catch{status(location.href);}});
$('scope').addEventListener('change',()=>{$('all-keys').disabled=$('scope').value!=='selected';if($('scope').value!=='selected')$('all-keys').checked=false;});
function loadScript(path){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=resolve;script.onerror=reject;document.head.append(script);});}
async function ensurePdf(){pdfLibraries??=Promise.all([loadScript('./vendor/pdf-lib.min.js'),loadScript('./vendor/fontkit.umd.min.js')]).catch(e=>{pdfLibraries=null;throw e;});return pdfLibraries;}
$('export').addEventListener('click',async()=>{const snapshot={...state},exportScope=$('scope').value,exportAllKeys=$('all-keys').checked;const t=copy[snapshot.lang];exporting=new AbortController();$('export').disabled=true;$('cancel-export').hidden=false;$('export-status').textContent=t.exporting;try{await ensurePdf();const bytes=await createAtlas(snapshot,{scope:exportScope,allKeys:exportAllKeys,signal:exporting.signal,progress:(n,total)=>{$('export-status').textContent=`${t.exporting} · ${n} / ${total}`;}});const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=`scales-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${snapshot.scale}-${rootName(snapshot).replaceAll('♯','sharp').replaceAll('♭','flat')}-${snapshot.hand}-${snapshot.lang}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('export-status').textContent=t.ready;}catch(error){$('export-status').textContent=error.name==='AbortError'?t.ready:`${t.error} ${error.message}`;}finally{$('export').disabled=false;$('cancel-export').hidden=true;exporting=null;}});
$('cancel-export').addEventListener('click',()=>exporting?.abort());
$('settings-details').open=!window.matchMedia('(max-width:720px)').matches;
window.addEventListener('resize',()=>{if(!window.matchMedia('(max-width:720px)').matches)$('settings-details').open=true;});
render();
