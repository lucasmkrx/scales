import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPluckedString,PluckedStringPlayer} from '../src/string-audio.mjs';
const rms=(data,a,b)=>{let sum=0;for(let i=a;i<b;i++)sum+=data[i]**2;return Math.sqrt(sum/(b-a));};
function measuredFrequency(data,fs,expected){
 const start=Math.round(fs*.18),count=Math.round(fs*.16),period=fs/expected,lo=Math.max(2,Math.floor(period*.96)),hi=Math.ceil(period*1.04),scores=[];
 for(let lag=lo;lag<=hi;lag++){
  let dot=0,energy=0;for(let i=start;i<start+count;i++){const a=data[i],b=data[i+lag];dot+=a*b;energy+=a*a+b*b;}
  scores.push(2*dot/energy);
 }
 let best=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;
 const a=scores[best-1],b=scores[best],c=scores[best+1];
 const fraction=Number.isFinite(a)&&Number.isFinite(c)?.5*(a-c)/(a-2*b+c):0;
 return fs/(lo+best+fraction);
}
test('plucked notes stay in tune from low bass to high guitar at both common sample rates',()=>{
 for(const sampleRate of [44100,48000])for(const midi of [21,28,40,52,64,76,88]){
  const instrument=midi<40?'bass':'guitar',samples=renderPluckedString(midi,{instrument,sampleRate}),expected=440*2**((midi-69)/12);
  const cents=1200*Math.log2(measuredFrequency(samples,sampleRate,expected)/expected);
  assert.ok(Math.abs(cents)<3,`${instrument} MIDI ${midi}, ${sampleRate} Hz: ${cents} cents`);
  assert.ok(samples.every(Number.isFinite));assert.ok(samples.every(v=>Math.abs(v)<=.681));
  assert.ok(samples[0]===0&&samples.at(-1)===0);
  assert.ok(rms(samples,sampleRate,Math.round(1.1*sampleRate))<rms(samples,Math.round(.04*sampleRate),Math.round(.15*sampleRate))*.3,'a pluck must decay');
 }
});
test('string generation is repeatable, rejects invalid inputs, and does not alias inaudible notes',()=>{
 assert.deepEqual(renderPluckedString(52),renderPluckedString(52));
 assert.throws(()=>renderPluckedString(NaN),RangeError);assert.throws(()=>renderPluckedString(52,{sampleRate:0}),RangeError);
 assert.ok(renderPluckedString(151,{sampleRate:44100}).every(v=>v===0));
});
test('Stop cancels active and future voices with a fade, and cached buffers are reused',()=>{
 const sources=[],gains=[];
 const param=()=>({value:0,events:[],setValueAtTime(...v){this.events.push(['set',...v]);},linearRampToValueAtTime(...v){this.events.push(['ramp',...v]);},cancelScheduledValues(...v){this.events.push(['cancel',...v]);},setTargetAtTime(...v){this.events.push(['target',...v]);}});
 const ctx={currentTime:1,sampleRate:44100,destination:{},createGain(){const node={gain:param(),connect(){},disconnect(){}};gains.push(node);return node;},createDynamicsCompressor(){return{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}};},createBuffer(channels,length,rate){return{duration:length/rate,copyToChannel(){}};},createBufferSource(){const node={connect(){},disconnect(){},starts:[],stops:[],start(t){this.starts.push(t);},stop(t){this.stops.push(t);}};sources.push(node);return node;}};
 const player=new PluckedStringPlayer(ctx),buffer=player.buffer(52,'guitar');
 assert.equal(player.buffer(52,'guitar'),buffer);
 player.play(52,{when:1,duration:1});player.play(55,{when:3,duration:1});
 ctx.currentTime=1.2;player.stop();assert.equal(player.voices.size,0);
 sources.forEach(source=>assert.ok(Math.abs(source.stops.at(-1)-1.225)<1e-9));
 gains.slice(1).forEach(gain=>assert.ok(gain.gain.events.some(e=>e[0]==='target'&&e[1]===0)));
 sources.forEach(source=>source.onended());
});
