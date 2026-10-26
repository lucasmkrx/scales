import {selection,boardModel,rootName,spellScale,midiName,prettyDegree,fretFill,PALETTE,SCALES,mod,pitchPreference} from './music.mjs';
import {FAMILIES} from './catalog.mjs';
import {guideBoardLayout,guitarWindows,bassRoute,guidePlan} from './guide-layout.mjs';
import {copy} from './i18n.mjs';
const W=841.89,H=595.28,M=44,R=W-M;

export async function createAtlas(input,{scope='selected',allKeys=false,asset,progress=()=>{},signal}={}){
 const {PDFDocument,rgb,PDFName,PDFString,PDFHexString}=globalThis.PDFLib??{};
 if(!PDFDocument||!globalThis.fontkit)throw new Error('PDF libraries are not loaded');
 const get=asset??(async path=>{const r=await fetch(new URL(`../${path}`,import.meta.url));if(!r.ok)throw new Error(`Cannot load ${path}`);return new Uint8Array(await r.arrayBuffer());});
 const initial=selection({...input,allNotes:false}),t=copy[initial.lang],pt=initial.lang==='pt';
 const tr=(en,br)=>pt?br:en,doc=await PDFDocument.create();doc.registerFontkit(globalThis.fontkit);
 const [bodyBytes,boldBytes,headBytes,logoBytes]=await Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf','Literata-Bold.ttf'].map(name=>get(`assets/fonts/${name}`)).concat(get('assets/marques-and-co.svg')));
 const body=await doc.embedFont(bodyBytes,{subset:true}),bold=await doc.embedFont(boldBytes,{subset:true}),heading=await doc.embedFont(headBytes,{subset:true});
 const logo=new TextDecoder().decode(logoBytes).match(/\bd="([^"]+)"/)[1];
 const color=hex=>rgb(...hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255));
 const ink=color('#20343f'),muted=color('#465865'),rule=color('#d0dbe2'),grid=color('#bbc7ce'),paper=rgb(.985,.99,.995),pale=color('#eff3f7');
 const selected=scope==='catalog'?SCALES:scope==='family'?SCALES.filter(s=>s.family===initial.scaleData.family):[initial.scaleData];
 if(!selected.length)throw new Error(t.selectFamily);
 const variants=selected.flatMap(scale=>(allKeys&&scope==='selected'?Array.from({length:12},(_,root)=>root):[initial.root]).map(root=>selection({...initial,root,scale:scale.id,formula:initial.formula}))).map(s=>({...s,title:`${rootName(s)} ${s.scaleData.name[s.lang]}`}));
 const plan=guidePlan(variants,{coverTitle:tr('Cover and contents','Capa e sumário'),readTitle:tr('How to use this guide','Como usar este guia'),contentsTitle:tr('Contents, continued','Continuação do sumário')});
 const pages=plan.entries.map(()=>{const p=doc.addPage([W,H]);p.drawRectangle({x:0,y:0,width:W,height:H,color:paper});return p;});
 const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Export canceled','AbortError');};
 checkAbort();
 function rect(page,x,top,width,height,fill,border){page.drawRectangle({x,y:H-top-height,width,height,color:fill,borderColor:border,borderWidth:border?.5:0});}
 function line(page,x,y,z,v,stroke=rule,width=.6){page.drawLine({start:{x,y:H-y},end:{x:z,y:H-v},thickness:width,color:stroke});}
 function circle(page,x,y,r,fill,border,width=.5){page.drawCircle({x,y:H-y,size:r,color:typeof fill==='string'?color(fill):fill,borderColor:border?(typeof border==='string'?color(border):border):undefined,borderWidth:border?width:0});}
 function poly(page,points,fill,border){const path=points.map(([x,y],i)=>`${i?'L':'M'} ${x} ${y}`).join(' ')+' Z';page.drawSvgPath(path,{x:0,y:H,color:fill,borderColor:border,borderWidth:border?.45:0});}
 function headingRuns(str){return String(str).split(/([♯♭]+)/).filter(Boolean).map(value=>({value,font:/[♯♭]/.test(value)?bold:heading}));}
 function text(page,x,top,str,size=10,font=body,fill=ink,width,align='left'){
  str=String(str);const runs=font===heading?headingRuns(str):[{value:str,font}];
  const measure=s=>runs.reduce((n,r)=>n+r.font.widthOfTextAtSize(r.value,s),0);
  if(width)size=Math.min(size,size*width/Math.max(measure(size),1));
  let xx=x-(align==='right'?measure(size):align==='center'?measure(size)/2:0);
  for(const run of runs){page.drawText(run.value,{x:xx,y:H-top,size,font:run.font,color:fill});xx+=run.font.widthOfTextAtSize(run.value,size);}
 }
 function para(page,x,top,str,width,size=9.3,leading=14,fill=ink,font=body){
  let value='';for(const word of str.split(/\s+/)){const next=(value+' '+word).trim();if(value&&font.widthOfTextAtSize(next,size)>width){text(page,x,top,value,size,font,fill);top+=leading;value=word;}else value=next;}
  if(value){text(page,x,top,value,size,font,fill);top+=leading;}return top;
 }
 function note(page,x,y,pc,root,r,label='',small=false){
  const fill=PALETTE[pc]??'#ffffff';
  if(root){circle(page,x,y,r+1.7,'#111111');circle(page,x,y,r+.6,'#ffffff');}
  circle(page,x,y,r,fill,fill==='#ffffff'?'#8fa2ae':undefined);
  if(label){const size=Math.min(small?7.2:11.2,r*1.05,label.length>2?r*.78:20);text(page,x,y+size*.34,label,size,bold,[0,5,7,9,11].includes(pc)?rgb(1,1,1):ink,r*1.8,'center');}
 }
 const instrument=s=>t[s.instrument],hand=s=>t[s.hand];
 const tuningName=s=>pt?s.tuningData.name.replace('standard','padrão'):s.tuningData.name;
 const pitches=(s,octaves=false)=>s.tuningData.notes.map(m=>midiName(m,pitchPreference(s)).replace(octaves?/$^/:/-?\d+$/,'')).join(' - ');
 function footer(page,n,caption=t.oneFret){
  text(page,M,566,caption,6.8,body,muted,620);
  text(page,R,566,`${String(n).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`,7.1,body,muted,undefined,'right');
  text(page,30,589,'Scales / Lucas Marques / CC BY 4.0',5.5,body,muted);
  page.drawSvgPath(logo,{x:W/2-42,y:16,scale:.084,color:color('#1d1d1d')});
 }
 function head(page,s,title,subtitle=''){
  text(page,M,28,`${instrument(s).toUpperCase()} / ${s.strings} ${t.strings.toUpperCase()} / ${s.frets} ${t.frets.toUpperCase()} / ${hand(s).toUpperCase()}`,7.1,bold,muted,510);
  text(page,R,28,tuningName(s).toUpperCase(),6.9,bold,muted,218,'right');
  text(page,R,50,pitches(s),11.4,bold,ink,218,'right');
  text(page,R,70,tr('lowest-pitched string to highest','da corda mais grave à mais aguda'),7.2,body,muted,218,'right');
  text(page,M,62,title,29,heading,ink,515);
  if(subtitle)text(page,M,83,subtitle,8.9,body,muted,515);
 }
 function drawBoard(page,state,{x=M,top=128,width=R-M,height=190,lo=0,hi=state.frets,small=false,route,miniature=false}={}){
  const model=boardModel(state,{lo,hi}),l=guideBoardLayout(state,{x,top,width,height,lo,hi,small});
  if(small){for(let f=lo;f<=hi;f++){const [a,b]=l.edges(f);rect(page,Math.min(a,b),top,Math.abs(b-a),height,color(fretFill(f)),grid);}}
  else{
   const [oa,ob]=l.edges(0),left=Math.min(oa,ob),right=Math.max(oa,ob),openTop=l.edgeY(l.nut),openBottom=l.edgeY(l.nut,true);
   page.drawSvgPath(`M ${left+7} ${openTop} L ${right-7} ${openTop} Q ${right} ${openTop} ${right} ${openTop+7} L ${right} ${openBottom-7} Q ${right} ${openBottom} ${right-7} ${openBottom} L ${left+7} ${openBottom} Q ${left} ${openBottom} ${left} ${openBottom-7} L ${left} ${openTop+7} Q ${left} ${openTop} ${left+7} ${openTop} Z`,{x:0,y:H,color:color(fretFill(0))});
   for(let f=1;f<=hi;f++){const [a,b]=l.edges(f);poly(page,[[a,l.edgeY(a)],[b,l.edgeY(b)],[b,l.edgeY(b,true)],[a,l.edgeY(a,true)]],color(fretFill(f)),grid);}
  }
  model.rows.forEach((m,row)=>{
   const stroke=color('#94a5af'),thickness=miniature?.3:small?.45+row*.05:.5+row*.07;
   if(!small)line(page,l.left,l.stringY(row,l.left),l.nut,l.stringY(row,l.nut),stroke,thickness);
   line(page,!small?l.nut:l.left,l.stringY(row,!small?l.nut:l.left),l.end,l.stringY(row,l.end),stroke,thickness);
   const name=midiName(m,pitchPreference(state)).replace(/-?\d+$/,'');
   if(!miniature){
    if(small)text(page,l.labelX,l.y(row,lo)+2,name,5.8,body,ink,14,'center');
    else{text(page,l.labelX,l.y(row,0)-2,row+1,9.4,bold,ink,undefined,'center');text(page,l.labelX,l.y(row,0)+9,name,6.7,body,ink,30,'center');}
   }
  });
  if(l.nut!==null)line(page,l.nut,l.edgeY(l.nut),l.nut,l.edgeY(l.nut,true),ink,small?1.8:3);
  const points=route?route.points.map(p=>({...p,pc:p.midi%12,root:p.midi%12===state.root,name:'',degree:prettyDegree(p.degree)})):model.points;
  for(const n of points){
   if(miniature&&PALETTE[n.pc]===undefined)continue;
   const [a,b]=l.edges(n.fret),radius=Math.min(miniature?2.4:small?(route?9.2:5.4):12.1,Math.abs(a-b)/2-2,l.rowGap/2-2.1);
   const label=miniature?'':small?(route?(n.root?t.rootMarker:n.degree):(n.root?t.rootMarker:'')):(state.labels==='degrees'?n.degree:n.name);
   note(page,l.center(n.fret),l.y(n.row,n.fret),n.pc,!miniature&&n.root,radius,label,small);
  }
  if(!miniature){
   if(!small){text(page,l.labelX,top-11,tr('STRING','CORDA'),6.4,bold,muted,undefined,'center');text(page,l.center(0),top-4,tr('OPEN','SOLTA'),6.6,bold,muted,undefined,'center');}
   for(let f=lo;f<=hi;f++){
    const yy=small?top+height+12:l.edgeY(l.center(f),true)+18;
    text(page,l.center(f),yy,f,small?6.6:8.2,body,muted,undefined,'center');
    if(!small&&f>0&&[0,3,5,7,9].includes(f%12)){
     const count=f%12===0?2:1;for(let d=0;d<count;d++)circle(page,l.center(f)+(d-(count-1)/2)*7,yy+12,2.8,'#111111');
    }
   }
   if(!small)text(page,l.center(0),l.edgeY(l.center(0),true)+35,tr('NUT','PESTANA'),6,bold,muted,undefined,'center');
  }
  return l;
 }
 function addLink(page,box,target){const annot=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[box[0],H-box[3],box[2],H-box[1]],Border:[0,0,0],Dest:[pages[target-1].ref,'Fit']});page.node.addAnnot(doc.context.register(annot));}
 function contents(page,entries,{x=M,top=180,width=R-M,step=20}={}){
  entries.forEach((entry,i)=>{const col=i%2,row=Math.floor(i/2),xx=x+col*width/2,yy=top+row*step;
   if(!col)line(page,x,yy-11,x+width,yy-11,rule,.4);
   text(page,xx,yy,String(entry.number).padStart(2,'0'),7.5,bold,muted);
   text(page,xx+22,yy,entry.title,7.8,body,ink,width/2-31);
   addLink(page,[xx,yy-10,xx+width/2-5,yy+5],entry.number);
  });
 }
 function callout(page,x,top,width,title,description){rect(page,x,top,width,34,pale);rect(page,x,top,3,34,ink);text(page,x+12,top+13,title,7.8,bold,ink,width-24);text(page,x+12,top+26,description,7.1,body,muted,width-24);}
 function cover(){
  const page=pages[0],panel=279,cx=306,cw=R-cx;
  rect(page,13,0,panel-13,577,rgb(.954,.968,.975));
  Object.values(PALETTE).forEach((v,i)=>rect(page,13+i*(W-26)/7,0,(W-26)/7,5,color(v)));
  text(page,M,39,tr('SCALE MAPS + GUIDED PRACTICE','MAPAS DE ESCALAS + PRÁTICA GUIADA'),7.1,bold,muted,210);
  text(page,M-3,111,instrument(initial),initial.instrument==='bass'?58:48,heading,ink,211);
  text(page,M,158,tr('Notes, scales,','Notas, escalas'),22.5,heading,ink,214);
  text(page,M,190,tr('and improvisation','e improvisação'),24,heading,ink,214);
  para(page,M,219,tr('For experienced TAB players who want to understand the notes and create their own phrases.','Para quem já toca por TAB e quer entender as notas e criar suas frases.'),212,9.5,14);
  line(page,M,263,248,263);
  text(page,M,287,tuningName(initial).toUpperCase(),7.1,bold,muted,206);
  text(page,M,310,pitches(initial),12.6,bold,ink,206);
  text(page,M,328,tr('lowest-pitched string to highest','da corda mais grave à mais aguda'),7.3,body,muted,206);
  text(page,M,343,`${initial.strings} ${t.strings.toUpperCase()} / ${initial.frets} ${t.frets.toUpperCase()}`,6.4,bold,muted,206);
  rect(page,34,350,228,112,rgb(1,1,1),rule);
  text(page,M,368,`${hand(initial).toUpperCase()} ${tr('FRETBOARD','/ MAPA DO BRAÇO')}`,6.7,bold,muted,204);
  drawBoard(page,{...initial,scale:'chromatic',scaleData:SCALES.find(s=>s.id==='chromatic')},{x:M-10,top:388,width:214,height:54,miniature:true});
  text(page,M,493,tr('NOTES / DEGREES / POSITIONS / PHRASING','NOTAS / GRAUS / POSIÇÕES / FRASEADO'),6.4,bold,muted,211);
  para(page,M,516,tr('Full fretboard maps, nearby positions, and a practical starting point for backing tracks.','Mapas completos, posições próximas e um ponto de partida para praticar com backing tracks.'),211,9.2,14);
  text(page,M,558,`${hand(initial).toUpperCase()} / ${pt?'PORTUGUÊS DO BRASIL':'AMERICAN ENGLISH'}`,6.8,bold,muted,211);
  text(page,cx,39,tr('FOR PLAYERS WHO WANT TO UNDERSTAND','PARA QUEM JÁ TOCA E QUER ENTENDER'),7.2,bold,muted,cw);
  text(page,cx,87,tr('Inside this guide','Conteúdo do guia'),28,heading,ink,cw);
  text(page,cx,115,tr('Your instrument, tuning, and scales in the guided-book format.','Seu instrumento, afinação e escalas no formato dos cadernos guiados.'),8.7,body,muted,cw);
  line(page,cx,138,R,138);
  text(page,cx,162,tr('CONTENTS / PAGES','SUMÁRIO / PÁGINAS'),7.6,bold,muted);
  const entries=plan.entries.slice(0,32);contents(page,entries,{x:cx,top:185,width:cw,step:Math.min(25,310/Math.max(1,Math.ceil(entries.length/2)-1))});
  if(entries.length<=8){
   text(page,cx,285,tr('YOUR SELECTION','SUA SELEÇÃO'),7.3,bold,muted);
   text(page,cx,315,variants.length===1?variants[0].title:tr('Explore the selected collection','Explore a coleção selecionada'),20,heading,ink,cw);
   if(variants.length===1){text(page,cx,340,spellScale(initial).join(' - '),10.8,bold,ink,cw);text(page,cx,363,`${t.formula}  ${initial.scaleData.formula.map(prettyDegree).join('  ')}`,9,body,muted,cw);}
   for(const [i,value] of [tr('Find the roots. Play a few notes slowly.','Encontre as tônicas. Toque poucas notas devagar.'),tr('Repeat a rhythm, leave space, and change the ending.','Repita um ritmo, deixe espaço e mude o final.'),tr('Check the track’s chords and aim for a chord tone.','Confira os acordes da base e mire em uma nota do acorde.')].entries())text(page,cx,407+i*24,`0${i+1}   ${value}`,8.7,body,ink,cw);
  }
  callout(page,cx,517,cw,tr('START WITH THE READING GUIDE','COMECE PELAS INSTRUÇÕES'),tr('Then use the maps to make short phrases and follow the chords.','Depois, use os mapas para criar frases curtas e acompanhar os acordes.'));
  addLink(page,[cx,517,R,551],plan.readingPage);
  text(page,cx,566,`${pages.length} ${tr('pages / clickable contents','páginas / sumário clicável')}`,7,body,muted);
  footer(page,1,'');
 }
 function readingGuide(){
  const page=pages[plan.readingPage-1];head(page,initial,tr('How to use this guide','Como usar este guia'),tr('Connect what you already play with the notes, degrees, and harmony.','Conecte o que você já toca com as notas, os graus e a harmonia.'));
  const columns=[
   [tr('Read the neck','Leia o braço'),[
    initial.hand==='left'?tr('The nut is on the right. Frets and pitches increase toward the left. Fret 0 is an open string.','A pestana fica à direita. As casas e os sons ficam mais agudos para a esquerda. A casa 0 é a corda solta.'):tr('The nut is on the left. Frets and pitches increase toward the right. Fret 0 is an open string.','A pestana fica à esquerda. As casas e os sons ficam mais agudos para a direita. A casa 0 é a corda solta.'),
    tr(`Top to bottom: ${[...initial.tuningData.notes].reverse().map(m=>midiName(m,pitchPreference(initial)).replace(/-?\d+$/,'')).join(', ')}. String 1 is the highest-pitched string. The bottom line is the lowest.`,`De cima para baixo: ${[...initial.tuningData.notes].reverse().map(m=>midiName(m,pitchPreference(initial)).replace(/-?\d+$/,'')).join(', ')}. A corda 1 é a mais aguda; a linha de baixo é a mais grave.`),
    tr('One fret raises the pitch a half step. The dots mark fret positions; the double dot marks an octave at fret 12.','Uma casa sobe um semitom. Os pontos marcam posições; o ponto duplo indica uma oitava na casa 12.')]],
   [tr('Read the symbols','Leia os símbolos'),[
    tr('Each pitch keeps its color, even with another spelling. Pitches between the natural-note colors use white circles. The black ring marks the tonic or chord root.','Cada som mantém sua cor, mesmo com outra grafia. Os sons entre as notas naturais usam círculos brancos. O anel preto marca a tônica ou fundamental do acorde.'),
    tr('R marks a root on the small maps. Degrees such as 1, 2, and ♭3 are intervals from the root, not fingers. ♯ means sharp; ♭ means flat.','T marca a tônica nos mapas pequenos. Graus como 1, 2 e ♭3 são intervalos a partir da tônica, não dedos. ♯ indica sustenido; ♭ indica bemol.'),
    tr('The note strip pairs names and degrees. Automatic follows scale spelling; Sharps and Flats display equivalent pitch names.','A = Lá, B = Si, C = Dó, D = Ré, E = Mi, F = Fá, G = Sol. A grafia automática segue os graus; sustenidos e bemóis mostram nomes equivalentes.')]],
   [tr('Use the maps','Use os mapas'),[
    initial.instrument==='bass'?tr('The full map shows every scale or chord tone. Small maps give ascending octave routes from the two lowest strings. Follow the degrees, then reverse. If an octave is out of reach in your tuning, a nearby note map takes its place.','O mapa completo mostra todas as notas da escala ou acorde. As rotas pequenas sobem uma oitava a partir das duas cordas graves. Siga os graus e volte. Se a afinação não permitir uma oitava, aparece um mapa de notas próximas.'):tr('The full map shows every scale or chord tone. The five smaller maps show all available notes in each fret range. They are position references, not prescribed fingerings or universal chord shapes.','O mapa completo mostra todas as notas da escala ou acorde. Os cinco mapas pequenos mostram as notas em cada região. São referências de posição, não digitações obrigatórias nem formas universais de acordes.'),
    tr('TAB still reads left to right in time. Changing the tuning changes the shapes; the notes here are calculated for your selected tuning.','A TAB continua sendo lida da esquerda para a direita no tempo. Mudar a afinação muda os desenhos; aqui, as notas são calculadas para a afinação escolhida.'),
    tr('Start with three notes. Repeat a rhythm, leave a rest, and vary the ending. Listen before adding more notes.','Comece com três notas. Repita um ritmo, deixe uma pausa e varie o final. Ouça antes de acrescentar mais notas.')]]
  ];
  columns.forEach(([title,paragraphs],i)=>{const x=M+i*258;text(page,x,135,`0${i+1}`,9,bold,muted);text(page,x,158,title,16,heading,ink,230);let y=184;for(const value of paragraphs)y=para(page,x,y,value,231,9,14)+13;});
  line(page,M,408,R,408);
  text(page,M,430,tr('THE SAME NOTE COLORS THROUGHOUT THE GUIDE','AS MESMAS CORES EM TODO O GUIA'),7.4,bold,muted);
  [0,2,4,5,7,9,11].forEach((pc,i)=>{const x=M+11+i*47;note(page,x,454,pc,false,10.5,midiName(pc+60).replace(/\d+$/,''));});
  text(page,423,449,tr('Sounding open-string pitches','Som real das cordas soltas'),7.6,bold,muted);
  text(page,423,468,pitches(initial,true),9,body,ink,R-423);
  callout(page,M,495,R-M,tr('BEFORE PLAYING OVER A BACKING TRACK','ANTES DE TOCAR COM UMA BACKING TRACK'),tr('Confirm the key and chord symbols. A scale is a note pool; listen and target the current chord’s tones.','Confira o tom e as cifras. A escala reúne notas possíveis; ouça e mire nas notas do acorde atual.'));
  footer(page,plan.readingPage,tr('Sounding pitches; middle C = C4.','Som real; dó central = C4.'));
 }
 function scaleLegend(page,s){
  line(page,M,506,R,506);
  text(page,M,520,s.scaleData.family==='arpeggio'?tr('CHORD NOTES + DEGREES','NOTAS DO ACORDE + GRAUS'):tr('SCALE NOTES + DEGREES','NOTAS DA ESCALA + GRAUS'),6.7,bold,muted);
  const names=spellScale(s),step=Math.min(42,310/names.length),radius=Math.min(10.5,step*.37);
  names.forEach((name,i)=>{const x=M+12+i*step;note(page,x,537,(s.root+s.scaleData.intervals[i])%12,i===0,radius,name);text(page,x,555,prettyDegree(s.scaleData.formula[i]),6.8,bold,ink,step-2,'center');});
  circle(page,382,537,9.6,rgb(1,1,1),ink,1.7);text(page,382,540.5,t.rootMarker,9.5,bold,ink,undefined,'center');
  text(page,401,532,tr('Root / tonic','Tônica / fundamental'),8.5,bold);
  text(page,401,547,tr('Black ring; R on small maps.','Anel preto; T nos mapas pequenos.'),6.8,body,muted,175);
  line(page,592,520,592,549);
  text(page,606,531,s.hand==='left'?tr('NUT ON THE RIGHT','PESTANA À DIREITA'):tr('NUT ON THE LEFT','PESTANA À ESQUERDA'),6.8,bold,muted);
  text(page,606,545,s.hand==='left'?tr('Higher frets to the left; degrees are not fingers.','Casas maiores à esquerda; graus, não dedos.'):tr('Higher frets to the right; degrees are not fingers.','Casas maiores à direita; graus, não dedos.'),6.6,body,muted,R-606);
 }
 function scalePage(entry){
  const s=entry.state,page=pages[entry.number-1],family=FAMILIES[s.scaleData.family]?.[s.lang]??t.custom;
  head(page,s,entry.title,`${family} · ${s.scaleData.intervals.length} ${tr('notes','notas')}`);
  text(page,M,105,`${t.formula.toUpperCase()}  ${s.scaleData.formula.map(prettyDegree).join('  ')}`,9,bold,ink,610);
  const height=s.instrument==='bass'&&s.strings===4?156:s.strings===7?190:180;
  drawBoard(page,s,{top:128,height});
  if(s.instrument==='guitar'){
   text(page,M,373,tr('POSITION MAPS / NEARBY FRET RANGES IN THIS TUNING','MAPAS DE POSIÇÃO / REGIÕES PRÓXIMAS NESTA AFINAÇÃO'),7.1,bold,muted);
   guitarWindows.forEach(([lo,hi],i)=>{const x=M+i*153;text(page,x,390,`${t.range} ${lo}-${hi}`,9,bold,ink,142);drawBoard(page,s,{x,top:402,width:142,height:82,lo,hi,small:true});});
  }else{
   const lower=s.strings>4?13:0;let complete=true;
   for(const [i,row] of [s.strings-1,s.strings-2].entries()){
    const route=bassRoute(s,row),x=M+i*260,name=midiName(s.tuningData.notes[s.strings-row-1],pitchPreference(s)).replace(/-?\d+$/,'');
    text(page,x,347+lower,tr(`Root on string ${row+1} · ${name}`,`Tônica na corda ${row+1} · ${name}`),10.3,bold,ink,245);
    const rootFret=mod(s.root-s.tuningData.notes[s.strings-row-1]);
    const range=route??{lo:Math.max(0,rootFret-2),hi:Math.min(s.frets,rootFret+2)};if(!route)complete=false;
    text(page,x,367+lower,route?tr(`Start: fret ${route.startFret} (${rootName(s)})`,`Início: casa ${route.startFret} (${rootName(s)})`):tr(`Nearby notes · frets ${range.lo}-${range.hi}`,`Notas próximas · casas ${range.lo}-${range.hi}`),8.2,body,ink,245);
    drawBoard(page,s,{x,top:382+lower,width:236,height:94-lower,lo:range.lo,hi:range.hi,small:true,route});
   }
   const x=M+520;text(page,x,347+lower,tr('Make a short phrase','Crie uma frase curta'),10.3,bold,ink,R-x);
   para(page,x,368+lower,complete?tr('Play the octave in degree order, then descend. Shift your hand when needed.','Toque a oitava na ordem dos graus e depois volte. Mude a posição da mão quando precisar.'):tr('Choose three nearby notes. Begin and end on the root. Shift your hand when needed.','Escolha três notas próximas. Comece e termine na tônica. Mude a posição da mão quando precisar.'),R-x,8.8,13);
   para(page,x,426,tr('Repeat a rhythm, leave space, and resolve to a tone of the current chord.','Repita um ritmo, deixe espaço e resolva em uma nota do acorde atual.'),R-x,8.8,13);
   text(page,x,489,complete?tr('Small maps: one octave, from R to R.','Mapas pequenos: uma oitava, de T a T.'):tr('Small maps: routes or nearby fret ranges.','Mapas pequenos: rotas ou regiões próximas.'),6.9,body,muted,R-x);
  }
  scaleLegend(page,s);footer(page,entry.number);
 }
 cover();
 for(let i=0;i<plan.extra;i++){
  const page=pages[i+1];head(page,initial,tr('Contents, continued','Continuação do sumário'),tr('Click a title to go directly to its scale map.','Clique em um título para abrir o mapa da escala.'));
  contents(page,plan.entries.slice(32+i*48,32+(i+1)*48),{top:128,step:17.5});footer(page,i+2,tr('Clickable contents / one scale per reference page.','Sumário clicável / uma escala por página de referência.'));
 }
 readingGuide();
 let rendered=0;
 for(const entry of plan.entries.filter(e=>e.type==='scale')){checkAbort();scalePage(entry);progress(++rendered,variants.length);await new Promise(resolve=>setTimeout(resolve,0));}
 const outline=doc.context.obj({Type:'Outlines',Count:plan.entries.length}),outlineRef=doc.context.register(outline),refs=plan.entries.map(()=>doc.context.nextRef());
 plan.entries.forEach((entry,i)=>{const item=doc.context.obj({Title:PDFHexString.fromText(entry.title),Parent:outlineRef,Dest:[pages[i].ref,'Fit']});if(i)item.set(PDFName.of('Prev'),refs[i-1]);if(i+1<refs.length)item.set(PDFName.of('Next'),refs[i+1]);doc.context.assign(refs[i],item);});
 outline.set(PDFName.of('First'),refs[0]);outline.set(PDFName.of('Last'),refs.at(-1));doc.catalog.set(PDFName.of('Outlines'),outlineRef);
 doc.catalog.set(PDFName.of('Lang'),PDFString.of(pt?'pt-BR':'en-US'));
 doc.setTitle(`Scales · ${instrument(initial)} · ${variants.length===1?variants[0].title:tr('Scale atlas','Atlas de escalas')} · ${tuningName(initial)}`);
 doc.setAuthor('Lucas Marques');doc.setSubject('Guided-book scale maps · Marques & Co.');doc.setKeywords(['Scales',initial.instrument,initial.hand,'CC BY 4.0']);
 checkAbort();return doc.save();
}
