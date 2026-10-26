import {SCALES,TUNINGS,selection,rootName,spellScale,prettyDegree,midiName,PALETTE,SHARPS,FLATS,parseNote,parseTuning,parseFormula,sharedState,scaleMidiSequence,pitchPreference} from './music.mjs';
import {PluckedStringPlayer,STRING_SOUNDS} from './string-audio.mjs';
import {matchingGuides} from './guides.mjs';
import {scaleGroups,initialScaleView} from './scale-picker.mjs';
import {readPreferences,restoreWorkspace,rememberWorkspace,changeSetup,exportPreview,scaleName} from './workspace.mjs';
import {FAMILIES} from './catalog.mjs';import {copy} from './i18n.mjs';import {boardSvg,escape} from './board.mjs';import {createAtlas} from './pdf.mjs';
const STORAGE_KEY='scales.preferences.v1';
let saved={};try{saved=readPreferences(localStorage.getItem(STORAGE_KEY));}catch{}
let state=restoreWorkspace(Object.fromEntries(new URLSearchParams(location.search)),saved);
let view=initialScaleView(state.scale),search='',instrumentAudio,playing=false,playbackVersion=0,playTimer,exporting,pdfLibraries,tuningDraft=false;
const $=id=>document.getElementById(id);
const options=(items,current)=>items.map(([value,label])=>`<option value="${escape(value)}" ${String(value)===String(current)?'selected':''}>${escape(label)}</option>`).join('');
const tuningName=tuning=>state.lang==='pt'?tuning.name.replace('standard','padrão'):tuning.name;
function persist(){saved=rememberWorkspace(saved,state);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));}catch{}}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function saveURL(){history.replaceState(null,'',`${location.pathname}?${sharedState(state)}`);}
function configuration(){const s=selection(state),t=copy[state.lang];return `${t[s.instrument]} · ${s.strings} ${t.strings.toLowerCase()} · ${tuningName(s.tuningData)} · ${t[s.hand]} · ${s.frets} ${t.frets.toLowerCase()}`;}
function openDialog(id,trigger){
 const dialog=$(id);dialog.returnFocus=trigger??document.activeElement;
 if(id==='scale-dialog'){
  view=initialScaleView(state.scale);search='';$('search').value='';renderScalePicker();
  if(state.scale==='custom'){$('advanced-scale').open=true;$('formula-input').value=state.formula;}
 }
 if(id==='export-dialog')renderExport();
 dialog.showModal();dialog.querySelector('.dialog-body').scrollTop=0;
 if(id==='scale-dialog')$('search').focus({preventScroll:true});
 else if(id==='instrument-dialog')document.querySelector('input[name=instrument]:checked').focus({preventScroll:true});
 else if(id==='display-dialog')$('spelling').focus({preventScroll:true});
 else $('scope').focus({preventScroll:true});
}
function closeDialog(dialog){
 if(dialog.id==='instrument-dialog'&&tuningDraft){
  $('tuning-error').textContent=copy[state.lang].closeEditorHint;
  $('tuning-fields').querySelector('input')?.focus();return;
 }
 dialog.close();
}
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openDialog(button.dataset.open,button)));
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))closeDialog(dialog);});
 dialog.addEventListener('close',()=>dialog.returnFocus?.focus({preventScroll:true}));
});
function renderScalePicker(){
 const t=copy[state.lang],groups=scaleGroups({view,search,lang:state.lang});
 $('scale-tabs').setAttribute('aria-label',t.collections);$('scale-results').setAttribute('aria-label',t.scale);
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 const count=groups.reduce((n,g)=>n+g.scales.length,0);$('scale-results-count').textContent=`${count} ${count===1?t.result:t.results}`;
 $('scale-results').innerHTML=groups.length?groups.map(group=>`<div class="scale-group"><h3>${escape(group.id==='common'?t.commonScales:group.label)}</h3>${group.scales.map(scale=>{
 const name=scaleName(scale,state.lang),full=scale.name[state.lang];
 const description=t.descriptions[scale.id]??t.familyDescriptions[scale.family]??t.genericDescription;
 return `<button type="button" class="scale-choice" data-scale="${scale.id}" aria-pressed="${state.scale===scale.id}"><span>${escape(name)}</span><small>${escape(description)}</small><span class="scale-formula">${scale.intervals.length} ${t.noteCount}${full!==name?` · ${escape(full)}`:''} · ${scale.formula.map(prettyDegree).join(' ')}</span></button>`;
 }).join('')}</div>`).join(''):`<p class="empty-results">${t.noResults}</p>`;
 const buttons=[...$('scale-results').querySelectorAll('[data-scale]')],entry=buttons.find(button=>button.dataset.scale===state.scale)??buttons[0];
 buttons.forEach(button=>button.tabIndex=button===entry?0:-1);
 const selected=selection(state).scaleData;
 $('scale-selection').textContent=`${t.currentScale}: ${rootName(state)} ${scaleName(selected,state.lang)}`;
}
function bookCards(){
 const t=copy[state.lang],guides=matchingGuides(state);
 $('books-configuration').textContent=`${t[state.lang]} · ${configuration()}`;
 $('books-grid').innerHTML=guides.length?guides.map(({instrument,strings,tuning,lang,hand,pages,file})=>{
  const preset=TUNINGS.find(v=>v.id===tuning);
  return `<article class="book"><p class="eyebrow">${t[lang]} · ${t[hand]}</p><h3>${t[instrument]}</h3><p>${strings} ${t.strings.toLowerCase()} · ${escape(tuningName(preset))}<br>${pages} ${t.pages} · A4</p><a href="./guides/${file}" download>${t.download} PDF ↗</a></article>`;
 }).join(''):`<article class="book book-empty"><h3>${t.noMatchingBook}</h3><p>${t.bookExportHint}</p><button type="button" class="secondary" data-open-export>${t.openExport}</button></article>`;
}
$('books-grid').addEventListener('click',event=>{const button=event.target.closest('[data-open-export]');if(button)openDialog('export-dialog',button);});
function renderContent(){
 const s=selection(state),t=copy[state.lang],names=spellScale(s);
 $('family-label').textContent=FAMILIES[s.scaleData.family]?.[s.lang]??t.custom;
 $('scale-title').textContent=`${rootName(s)} ${scaleName(s.scaleData,s.lang)}`;
 $('scale-value').textContent=scaleName(s.scaleData,s.lang);
 $('notes-strip').innerHTML=names.map((name,i)=>`<span class="note-chip"><span class="color-dot" style="background:${PALETTE[(s.root+s.scaleData.intervals[i])%12]??'#fff'}"></span>${escape(name)}<small>${prettyDegree(s.scaleData.formula[i])}</small></span>`).join('');
 $('tuning-description').innerHTML=`${t.openStrings}<strong>${s.tuningData.notes.map(m=>midiName(m,pitchPreference(s))).join(' - ')}</strong>`;
 $('orientation').textContent=s.hand==='left'?t.nutRight:t.nutLeft;
 const board=$('board'),scroll=board.scrollLeft,key=[s.instrument,s.strings,s.tuning,s.customTuning,s.hand,s.frets].join('|'),reset=board.dataset.setup!==key;
 board.innerHTML=boardSvg(s);board.dataset.setup=key;board.scrollLeft=reset?(s.hand==='left'?board.scrollWidth-board.clientWidth:0):scroll;
 $('positions').innerHTML=[[0,4],[3,7],[5,9],[8,12]].map(([lo,hi])=>`<article class="position"><h3>${t.range} ${lo}-${hi}</h3>${boardSvg({...s,allNotes:false},{lo,hi,width:400,height:s.strings===7?190:170,small:true})}</article>`).join('');
 $('degrees-hint').hidden=s.labels!=='degrees';saveURL();
}
function renderTuningFields(){
 const s=selection(state),t=copy[state.lang];
 $('tuning-fields').innerHTML=s.tuningData.notes.map((m,i)=>`<label><span>${t.string} ${s.strings-i}${i===0?` · ${t.lowest}`:i===s.strings-1?` · ${t.highest}`:''}</span><input id="string-pitch-${i}" data-string-pitch value="${midiName(m,s.spelling==='flat'?'flat':'sharp')}" autocomplete="off" spellcheck="false" aria-describedby="tuning-error" aria-label="${t.string} ${s.strings-i}, ${i===0?t.lowest:i===s.strings-1?t.highest:''}"></label>`).join('');
}
function renderExport(){
 const s=selection(state),t=copy[state.lang];
 const familyOption=$('scope').querySelector('[value=family]');familyOption.disabled=s.scaleData.family==='custom';
 if(familyOption.disabled&&$('scope').value==='family')$('scope').value='selected';
 const selected=$('scope').value==='selected';$('all-keys-control').hidden=!selected;$('export-keys-hint').hidden=selected;
 const allKeys=selected&&$('all-keys').checked,estimate=exportPreview(state,{scope:$('scope').value,allKeys});
 const title=$('scope').value==='catalog'?`${rootName(s)} · ${t.catalogScope}`:$('scope').value==='family'?`${rootName(s)} · ${FAMILIES[s.scaleData.family][s.lang]}`:allKeys?`${scaleName(s.scaleData,s.lang)} · ${t.allKeys}`:`${rootName(s)} ${scaleName(s.scaleData,s.lang)}`;
 $('export-configuration').innerHTML=`<strong>${escape(title)}</strong>${escape(configuration())}<br>${s.tuningData.notes.map(m=>midiName(m,pitchPreference(s))).join(' – ')}<br>${escape(t[s.lang])}`;
 $('export-estimate').textContent=`${estimate.pages} ${t.pages} · ${estimate.count} ${estimate.count===1?t.scaleMap:t.scaleMaps}${allKeys?'':` · ${t.currentRoot}: ${rootName(s)}`}`;
}
function render(){
 const t=copy[state.lang],s=selection(state);
 document.documentElement.lang=state.lang==='pt'?'pt-BR':'en-US';
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]??el.textContent;});
 document.querySelectorAll('.close-dialog').forEach(button=>button.setAttribute('aria-label',t.close));
 $('language').value=state.lang;$('search').placeholder=t.searchPlaceholder;
 $('stats').innerHTML=`<strong>${SCALES.length}</strong> ${t.catalog}<br><strong>${TUNINGS.length}</strong> ${t.tunings}`;
 $('instrument-summary').textContent=configuration();
 document.querySelector('.instrument-summary').setAttribute('aria-label',t.yourInstrument);
 for(const name of ['instrument','labels'])document.querySelectorAll(`input[name="${name}"]`).forEach(input=>input.checked=input.value===state[name]);
 $('strings').innerHTML=options((state.instrument==='guitar'?[6,7]:[4,5,6]).map(n=>[n,n]),state.strings);
 for(const id of ['hand','frets','spelling'])$(id).value=String(state[id]);
 $('tuning').innerHTML=options([...TUNINGS.filter(v=>v.instrument===state.instrument&&v.strings===state.strings).map(v=>[v.id,`${tuningName(v)} · ${v.notes.map(m=>midiName(m,'sharp')).join(' – ')}`]),['custom',t.custom]],tuningDraft?'custom':state.tuning);
 $('preset-notes').innerHTML=`<small>${t.openStrings}</small>${s.tuningData.notes.map(m=>midiName(m,pitchPreference(state))).join(' – ')}`;
 $('root').innerHTML=options(Array.from({length:12},(_,i)=>[i,SHARPS[i]===FLATS[i]?SHARPS[i]:`${SHARPS[i]} / ${FLATS[i]}`]),state.root);
 $('allNotes').checked=state.allNotes;
 $('custom-tuning').hidden=!tuningDraft;
 renderScalePicker();bookCards();renderContent();renderExport();
}
function update(values,{setup=false}={}){
 stopAudio();const previous=state;
 state=changeSetup(state,values,saved);persist();status('');$('setup-status').textContent='';render();
 if(setup){$('setup-status').textContent=previous.tuning!==state.tuning?copy[state.lang].tuningReset:'';}
}
function cancelTuning(){tuningDraft=false;$('tuning-error').textContent='';$('custom-tuning').hidden=true;render();}
function applyTuning(){
 const fields=[...$('tuning-fields').querySelectorAll('input')],text=fields.map(field=>field.value.trim()).join(' ');
 fields.forEach(field=>field.removeAttribute('aria-invalid'));
 const invalid=fields.filter(field=>{try{parseNote(field.value);return false;}catch{return true;}});
 if(invalid.length){invalid.forEach(field=>field.setAttribute('aria-invalid','true'));$('tuning-error').textContent=copy[state.lang].tuningExample;invalid[0].focus();return;}
 try{parseTuning(text,state.strings);tuningDraft=false;update({tuning:'custom',customTuning:text});$('tuning-error').textContent='';$('setup-status').textContent=copy[state.lang].tuningApplied;$('tuning').focus();}
 catch{fields.forEach(field=>field.setAttribute('aria-invalid','true'));$('tuning-error').textContent=copy[state.lang].tuningOrder;fields[0]?.focus();}
}
function applyScale(){
 try{parseFormula($('formula-input').value);$('formula-error').textContent='';$('formula-input').removeAttribute('aria-invalid');update({scale:'custom',formula:$('formula-input').value});closeDialog($('scale-dialog'));}
 catch{$('formula-error').textContent=copy[state.lang].formulaHint;$('formula-input').setAttribute('aria-invalid','true');$('formula-input').focus();}
}
async function audioPlayer(){
 if(!instrumentAudio){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Audio unavailable');instrumentAudio=new PluckedStringPlayer(new Context());}
 await instrumentAudio.context.resume();return instrumentAudio;
}
function stopAudio(){
 playbackVersion++;playing=false;instrumentAudio?.stop();clearTimeout(playTimer);
 $('play').textContent=copy[state.lang].play;$('play').classList.remove('playing');
}
async function startPlayback(midi){
 stopAudio();const version=playbackVersion,snapshot={...state};playing=true;
 $('play').textContent=copy[state.lang].stop;$('play').classList.add('playing');
 try{
  const player=await audioPlayer();if(version!==playbackVersion)return;
  const notes=midi===undefined?scaleMidiSequence(snapshot):[midi];
  for(const note of new Set(notes))player.buffer(note,snapshot.instrument);
  const start=player.context.currentTime+.025;
  const duration=midi===undefined?(snapshot.instrument==='bass'?.95:.78):STRING_SOUNDS[snapshot.instrument].seconds;
  let end=start;
  notes.forEach((note,i)=>{end=player.play(note,{instrument:snapshot.instrument,when:start+i*.36,duration});});
  playTimer=setTimeout(()=>{if(version===playbackVersion)stopAudio();},Math.max(0,(end-player.context.currentTime)*1000)+40);
 }catch{if(version===playbackVersion){stopAudio();status(copy[state.lang].audioUnavailable,true);}}
}
const playNote=midi=>startPlayback(midi);
$('play').addEventListener('click',()=>{if(playing)stopAudio();else startPlayback();});
window.addEventListener('pagehide',stopAudio);
for(const id of ['board','positions']){const el=$(id);el.addEventListener('click',event=>{const note=event.target.closest('[data-midi]');if(note)playNote(Number(note.dataset.midi));});el.addEventListener('keydown',event=>{const note=event.target.closest('[data-midi]');if(note&&['Enter',' '].includes(event.key)){event.preventDefault();playNote(Number(note.dataset.midi));}});}
$('instrument').addEventListener('change',event=>{tuningDraft=false;$('tuning-error').textContent='';update({instrument:event.target.value},{setup:true});});
$('strings').addEventListener('change',()=>{tuningDraft=false;$('tuning-error').textContent='';update({strings:$('strings').value},{setup:true});});
for(const id of ['hand','frets','root','spelling'])$(id).addEventListener('change',()=>update({[id]:$(id).value}));
$('labels').addEventListener('change',event=>update({labels:event.target.value}));
$('tuning').addEventListener('change',()=>{
 if($('tuning').value==='custom'){tuningDraft=true;renderTuningFields();$('custom-tuning').hidden=false;$('tuning-error').textContent='';$('tuning-fields').querySelector('input').focus();}
 else{tuningDraft=false;$('tuning-error').textContent='';update({tuning:$('tuning').value});}
});
$('tuning-fields').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyTuning();}});
$('formula-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyScale();}});
$('scale-results').addEventListener('click',event=>{const button=event.target.closest('[data-scale]');if(button){update({scale:button.dataset.scale});closeDialog($('scale-dialog'));}});
$('scale-results').addEventListener('keydown',event=>{
 const buttons=[...$('scale-results').querySelectorAll('[data-scale]')],index=buttons.indexOf(event.target);if(index<0)return;
 let next;if(event.key==='ArrowDown')next=Math.min(index+1,buttons.length-1);if(event.key==='ArrowUp')next=Math.max(index-1,0);if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
 if(next!==undefined){event.preventDefault();buttons.forEach((button,i)=>button.tabIndex=i===next?0:-1);buttons[next].focus();}
});
$('search').addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();closeDialog($('scale-dialog'));}
 if(event.key==='ArrowDown'){event.preventDefault();$('scale-results').querySelector('[data-scale]')?.focus();}
});
$('scale-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button){view=button.dataset.view;search='';$('search').value='';renderScalePicker();}});
$('apply-tuning').addEventListener('click',applyTuning);$('cancel-tuning').addEventListener('click',cancelTuning);$('apply-scale').addEventListener('click',applyScale);
$('instrument-form').addEventListener('submit',event=>event.preventDefault());
$('search').addEventListener('input',()=>{search=$('search').value;renderScalePicker();});
$('language').addEventListener('change',()=>update({lang:$('language').value}));
$('allNotes').addEventListener('change',()=>update({allNotes:$('allNotes').checked}));
$('share').addEventListener('click',async()=>{saveURL();try{await navigator.clipboard.writeText(location.href);status(copy[state.lang].saved);}catch{status(location.href);}});
$('scope').addEventListener('change',renderExport);$('all-keys').addEventListener('change',renderExport);
function loadScript(path){
 return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=resolve;script.onerror=reject;document.head.append(script);});
}
async function ensurePdf(){
 pdfLibraries??=Promise.all([loadScript('./vendor/pdf-lib.min.js'),loadScript('./vendor/fontkit.umd.min.js')]).catch(error=>{pdfLibraries=null;throw error;});
 return pdfLibraries;
}
$('export').addEventListener('click',async()=>{
 if(exporting)return;
 const snapshot={...state},scope=$('scope').value,allKeys=scope==='selected'&&$('all-keys').checked,t=copy[snapshot.lang];
 const controller=new AbortController();exporting=controller;
 $('export').disabled=true;$('scope').disabled=true;$('all-keys').disabled=true;$('cancel-export').hidden=false;
 $('export-status').textContent=t.exporting;
 try{
  await ensurePdf();
  const bytes=await createAtlas(snapshot,{scope,allKeys,signal:controller.signal,progress:(n,total)=>{$('export-status').textContent=`${t.exporting} · ${n} / ${total}`;}});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');
  link.href=url;link.download=`scales-${snapshot.instrument}-${snapshot.strings}-${snapshot.tuning}-${snapshot.scale}-${rootName(snapshot).replaceAll('♯','sharp').replaceAll('♭','flat').replaceAll('/','-')}-${snapshot.hand}-${snapshot.lang}.pdf`;
  link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('export-status').textContent=t.ready;
 }catch(error){$('export-status').textContent=error.name==='AbortError'?t.cancelled:t.exportFailed;}
 finally{$('export').disabled=false;$('scope').disabled=false;$('all-keys').disabled=false;$('cancel-export').hidden=true;exporting=null;}
});
$('cancel-export').addEventListener('click',()=>exporting?.abort());
persist();render();
