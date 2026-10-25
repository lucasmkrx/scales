import {selection,boardModel,layoutBoard,rootName,spellScale,midiName,prettyDegree,fretFill,PALETTE,SCALES} from './music.mjs';
import {copy} from './i18n.mjs';
const W=841.89,H=595.28;
export async function createAtlas(input,{scope='selected',allKeys=false,asset,progress=()=>{},signal}={}){
 const {PDFDocument,rgb}=globalThis.PDFLib??{};if(!PDFDocument||!globalThis.fontkit)throw new Error('PDF libraries are not loaded');
 const get=asset??(async path=>{const r=await fetch(new URL(`../${path}`,import.meta.url));if(!r.ok)throw new Error(`Cannot load ${path}`);return new Uint8Array(await r.arrayBuffer());});
 const initial=selection({...input,allNotes:false});const t=copy[initial.lang];const doc=await PDFDocument.create();doc.registerFontkit(globalThis.fontkit);
 const [bodyBytes,headBytes,logoBytes]=await Promise.all([get('assets/fonts/DejaVuSans.ttf'),get('assets/fonts/Literata-Bold.ttf'),get('assets/marques-and-co.svg')]);
 const body=await doc.embedFont(bodyBytes,{subset:true});const heading=await doc.embedFont(headBytes,{subset:true});const logo=new TextDecoder().decode(logoBytes).match(/\bd="([^"]+)"/)[1];
 const color=hex=>rgb(...hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255));const ink=color('#20343f'),muted=color('#465865'),rule=color('#d0dbe2'),paper=color('#fafbfc');
 const locales=initial.lang==='pt';const tr=(en,pt)=>locales?pt:en;
 const selected=scope==='catalog'?SCALES:scope==='family'?SCALES.filter(s=>s.family===initial.scaleData.family):[initial.scaleData];
 if(!selected.length)throw new Error(t.selectFamily);
 const variants=selected.flatMap(scale=>(allKeys&&scope==='selected'?Array.from({length:12},(_,root)=>root):[initial.root]).map(root=>selection({...initial,root,scale:scale.id,formula:initial.formula})));
 const count=1+variants.length*2;const front=doc.addPage([W,H]);const pages=[];
 function text(page,x,top,str,size=10,font=body,fill=ink,width){
  str=String(str);if(font===heading)str=str.replaceAll('♯',locales?' sustenido':'-sharp').replaceAll('♭',locales?' bemol':'-flat');if(width)size=Math.min(size,size*width/Math.max(font.widthOfTextAtSize(str,size),1));page.drawText(str,{x,y:H-top,size,font,color:fill});
 }
 function para(page,x,top,str,width,size=10,leading=15){
  let line='';for(const word of str.split(/\s+/)){const next=(line+' '+word).trim();if(line&&body.widthOfTextAtSize(next,size)>width){text(page,x,top,line,size);top+=leading;line=word;}else line=next;}if(line){text(page,x,top,line,size);top+=leading;}return top;
 }
 function line(page,x,y,z,v,stroke=rule,width=.6){page.drawLine({start:{x,y:H-y},end:{x:z,y:H-v},thickness:width,color:stroke});}
 function circle(page,x,y,r,fill,border){page.drawCircle({x,y:H-y,size:r,color:color(fill),borderColor:border?color(border):undefined,borderWidth:border?0.5:0});}
 function footer(page,n){line(page,44,563,W-44,563);text(page,44,582,'Scales · Lucas Marques · CC BY 4.0',6.7,body,muted);page.drawSvgPath(logo,{x:W/2-38,y:23,scale:.076,color:ink});text(page,W-82,582,`${n} / ${count}`,7,body,muted);}
 function head(page,state,title,subtitle){page.drawRectangle({x:0,y:0,width:W,height:H,color:paper});text(page,44,30,`${tr(state.instrument==='bass'?'BASS':'GUITAR',state.instrument==='bass'?'BAIXO':'GUITARRA')} / ${state.strings} ${tr('STRINGS','CORDAS')} / ${state.hand==='left'?tr('LEFT-HANDED','CANHOTOS'):tr('RIGHT-HANDED','DESTROS')}`,7.5,body,muted);text(page,44,74,title,27,heading,ink,650);text(page,44,98,subtitle,9.5,body,muted,754);}
 function drawBoard(page,state,x,top,width,height,{lo=0,hi=state.frets,small=false}={}){
  const model=boardModel(state,{lo,hi});const l=layoutBoard(model,{width,height,small});
  for(let f=lo;f<=hi;f++){const [a,z]=l.edges(f);const taper=(hi-f)*.10;page.drawRectangle({x:x+a,y:H-(top+l.bottom+12+taper),width:z-a,height:l.bottom-l.top+24+2*taper,color:color(fretFill(f)),borderColor:color('#bbc7ce'),borderWidth:.35});text(page,x+l.center(f)-3,top+height-9,f===0?'0':String(f),small?7:8,body,muted);}
  model.rows.forEach((m,row)=>{line(page,x+l.left,top+l.y(row),x+l.right,top+l.y(row),color('#94a5af'),.5+row*.07);const label=midiName(m,state.tuningData.preferred).replace(/-?\d+$/,'');text(page,x+l.labelX-4,top+l.y(row)+3,label,small?7:8);});
  if(l.nut!==null)line(page,x+l.nut,top+l.top-12,x+l.nut,top+l.bottom+12,ink,2.6);
  for(const n of model.points){const [a,z]=l.edges(n.fret);const radius=Math.min(small?5.2:11,(z-a)*.4);const xx=x+l.center(n.fret),yy=top+l.y(n.row);if(n.root){circle(page,xx,yy,radius+2.2,'#111111');circle(page,xx,yy,radius+.9,'#ffffff');}circle(page,xx,yy,radius,n.fill,n.fill==='#ffffff'?'#8fa2ae':undefined);const label=small?(n.root?t.rootMarker:''):(state.labels==='degrees'?n.degree:n.name);if(label){const size=Math.min(radius*1.1,label.length>2?radius*.8:20);const tw=body.widthOfTextAtSize(label,size);text(page,xx-tw/2,yy+size*.33,label,size,body,n.lightText?rgb(1,1,1):ink);}}
 }
 const roots=variants.length===12&&allKeys?tr('All 12 keys','Os 12 tons'):rootName(initial);
 head(front,initial,'Scales',tr('Notes, scales, and improvisation','Notas, escalas e improvisação'));
 text(front,44,132,`${initial.tuningData.name} · ${initial.tuningData.notes.map(m=>midiName(m,initial.tuningData.preferred)).join(' - ')}`,11);
 text(front,44,153,`${roots} · ${variants.length} ${variants.length===1?tr('scale map','mapa de escala'):tr('scale maps','mapas de escala')} · ${tr('Sounding pitches; middle C = C4.','Som real; dó central = C4.')}`,9.2,body,muted);
 if(variants.length<=12){
  text(front,44,197,tr('HOW TO USE THIS ATLAS','COMO USAR ESTE ATLAS'),10,body);
  let yy=226;for(const value of [t.oneFret,t.legend,initial.hand==='left'?t.nutRight:t.nutLeft,t.positionHint,t.practice1,t.practice2,t.practice3])yy=para(front,44,yy,value,740,10,16)+12;
 }else{
  text(front,44,183,tr('CONTENTS / MAP PAGES','SUMÁRIO / PÁGINAS DOS MAPAS'),9,body);
  const rows=Math.ceil(variants.length/2);variants.forEach((s,i)=>{const col=Math.floor(i/rows),row=i%rows;text(front,44+col*385,204+row*9.8,`${String(i*2+2).padStart(2,'0')}  ${rootName(s)} ${s.scaleData.name[s.lang]}`,7.8,body,ink,360);});
 }
 footer(front,1);
 for(let i=0;i<variants.length;i++){
  if(signal?.aborted)throw new DOMException('Export canceled','AbortError');const s=variants[i],title=`${rootName(s)} ${s.scaleData.name[s.lang]}`;const notes=spellScale(s).join(' - ');const tuning=`${s.tuningData.name} · ${s.tuningData.notes.map(m=>midiName(m,s.tuningData.preferred)).join(' - ')}`;
  const page=doc.addPage([W,H]);head(page,s,title,tuning);drawBoard(page,s,30,123,W-60,248);text(page,44,403,`${t.formula}: ${s.scaleData.formula.map(prettyDegree).join(' - ')}`,11);text(page,44,429,`${t.notes}: ${notes}`,11,body,ink,754);text(page,44,463,s.hand==='left'?t.nutRight:t.nutLeft,9,body,muted);para(page,44,490,t.legend,740,9.4,14);para(page,44,527,t.practice2,740,9,13);footer(page,i*2+2);pages.push(page);
  const positions=doc.addPage([W,H]);head(positions,s,title,`${t.positions} · ${tuning}`);[[0,4],[3,7],[5,9],[8,12]].forEach(([lo,hi],j)=>{const xx=40+(j%2)*385,yy=132+Math.floor(j/2)*202;text(positions,xx+8,yy,`${t.range} ${lo}-${hi}`,10);drawBoard(positions,s,xx,yy+10,365,164,{lo,hi,small:true});});para(positions,44,535,t.positionHint,740,8.6,12);footer(positions,i*2+3);
  progress(i+1,variants.length);await new Promise(resolve=>setTimeout(resolve,0));
 }
 // Internal links on the contents page, and semantic PDF outlines for every map.
 const {PDFName,PDFString,PDFHexString}=globalThis.PDFLib;
 const outline=doc.context.obj({Type:'Outlines',Count:pages.length});const outlineRef=doc.context.register(outline);const refs=pages.map(()=>doc.context.nextRef());
 pages.forEach((page,i)=>{const spec=variants[i];const item=doc.context.obj({Title:PDFHexString.fromText(`${rootName(spec)} ${spec.scaleData.name[spec.lang]}`),Parent:outlineRef,Dest:[page.ref,'Fit']});if(i)item.set(PDFName.of('Prev'),refs[i-1]);if(i+1<refs.length)item.set(PDFName.of('Next'),refs[i+1]);doc.context.assign(refs[i],item);});
 if(refs.length){outline.set(PDFName.of('First'),refs[0]);outline.set(PDFName.of('Last'),refs.at(-1));doc.catalog.set(PDFName.of('Outlines'),outlineRef);}
 if(variants.length>12){const rows=Math.ceil(variants.length/2);pages.forEach((page,i)=>{const x=44+Math.floor(i/rows)*385,top=204+(i%rows)*9.8;const link=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,H-top-2,x+360,H-top+8],Border:[0,0,0],Dest:[page.ref,'Fit']});front.node.addAnnot(doc.context.register(link));});}
 doc.catalog.set(PDFName.of('Lang'),PDFString.of(locales?'pt-BR':'en-US'));
 doc.setTitle(`Scales · ${initial.tuningData.name} · ${roots}`);doc.setAuthor('Lucas Marques');doc.setSubject('Guitar and bass scales · Marques & Co.');doc.setKeywords(['Scales',initial.instrument,initial.hand,'CC BY 4.0']);
 if(signal?.aborted)throw new DOMException('Export canceled','AbortError');return doc.save();
}
