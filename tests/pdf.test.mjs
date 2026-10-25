import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInThisContext} from 'node:vm';
import {createAtlas} from '../src/pdf.mjs';
for(const name of ['pdf-lib.min.js','fontkit.umd.min.js'])runInThisContext(await readFile(new URL(`../public/vendor/${name}`,import.meta.url),'utf8'),{filename:name});
const asset=async path=>new Uint8Array(await readFile(new URL(`../public/${path}`,import.meta.url)));
test('downloaded guides embed the book fonts and link the contents to real pages',async()=>{
 for(const state of [{instrument:'bass',strings:4,hand:'left',root:9,scale:'minor-pentatonic',lang:'en'},{instrument:'guitar',strings:7,tuning:'guitar-7-drop-a',root:6,lang:'pt',scale:'harmonic-minor'},{instrument:'bass',strings:4,tuning:'custom',customTuning:'C0 C4 C5 C6',frets:20,root:11,lang:'en',scale:'major'}]){
  const bytes=await createAtlas(state,{asset}),doc=await PDFLib.PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),3);assert.deepEqual(doc.getPage(2).getSize(),{width:841.89,height:595.28});
  assert.equal(doc.catalog.get(PDFLib.PDFName.of('Lang')).decodeText(),state.lang==='pt'?'pt-BR':'en-US');
  const annots=doc.getPage(0).node.Annots();assert.equal(annots.size(),4);
  for(let i=0;i<annots.size();i++){
   const link=doc.context.lookup(annots.get(i));const dest=link.get(PDFLib.PDFName.of('Dest'));assert.ok(doc.getPages().some(p=>p.ref.toString()===dest.get(0).toString()));
  }
  const names=[...doc.context.enumerateIndirectObjects()].filter(([,o])=>o instanceof PDFLib.PDFDict).map(([,o])=>o.get(PDFLib.PDFName.of('BaseFont'))?.toString()??'').join(' ');
  assert.match(names,/Literata/);assert.match(names,/DejaVuSans-Bold/);
 }
});
test('all-key exports keep one scale per map page and support cancellation',async()=>{
 const bytes=await createAtlas({scale:'minor-pentatonic'},{asset,allKeys:true}),doc=await PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),14);assert.equal(doc.getPage(0).node.Annots().size(),15);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>createAtlas({},{asset,signal:controller.signal}),{name:'AbortError'});
});
