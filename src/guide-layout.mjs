import {selection,boardModel,mod} from './music.mjs';

// The books use a continuous tapered neck; the open-string lane stays rectangular.
export function guideBoardLayout(input,{x=44,top=128,width=754,height=190,lo=0,hi,small=false}={}){
 const state=selection(input),rows=state.strings;hi??=state.frets;
 const mirror=v=>state.hand==='left'?2*x+width-v:v;
 const scale=width/754,vertical=Math.min(1,height/156);
 const label=x+(small?7:17*scale),left=x+(small?19:44*scale),open=small?0:38*scale;
 const nut=left+open,end=x+width-(small?3:0),n=hi-lo+1;
 const start=small?left:nut,first=Math.max(1,lo),count=hi-first+1;
 const bound=i=>small?left+(end-left)*i/n:start+(end-start)*(1-2**(-i/12))/(1-2**(-count/12));
 const edges=f=>{const a=!small&&f===0?left:bound(small?f-lo:f-first),b=!small&&f===0?nut:bound(small?f-lo+1:f-first+1);return [mirror(a),mirror(b)];};
 const center=f=>{const [a,b]=edges(f);return (a+b)/2;};
 const middle=top+height/2;
 const halfAt=xx=>height/2-(small?0:9*vertical*(1-Math.max(0,Math.min(1,(xx-nut)/(end-nut)))));
 const stringY=(row,xx)=>{const raw=state.hand==='left'?2*x+width-xx:xx;const margin=small?height/rows/2:15*vertical;return middle+(row/(rows-1)*2-1)*(halfAt(raw)-margin);};
 const y=(row,fret)=>stringY(row,center(fret));
 const edgeY=(xx,bottom=false)=>{const raw=state.hand==='left'?2*x+width-xx:xx;return middle+(bottom?1:-1)*halfAt(raw);};
 const rowGap=small?height/rows:(height-48*vertical)/(rows-1);
 return {state,lo,hi,rows,x,top,width,height,left:mirror(left),end:mirror(end),nut:!small||lo===0?mirror(small?bound(1):nut):null,labelX:mirror(label),edges,center,y,stringY,edgeY,rowGap,small};
}

export const guitarWindows=Object.freeze([[0,4],[3,7],[5,9],[8,12],[10,14]]);

// Choose a playable ascending octave, keeping the hand span small. These routes
// are derived from actual pitches, so drop and extended-range tunings work too.
export function bassRoute(input,startRow){
 const s=selection(input),rows=[...s.tuningData.notes].reverse();
 const fret=mod(s.root-rows[startRow]),root=rows[startRow]+fret;
 const targets=s.scaleData.intervals.concat(12).map(n=>root+n);
 let routes=[{points:[{row:startRow,fret,midi:root,degree:'1'}],lo:fret,hi:fret,cost:0}];
 for(let step=1;step<targets.length;step++){
  const next=[];
  for(const route of routes){const last=route.points.at(-1);
   for(let row=0;row<=last.row;row++){
    const f=targets[step]-rows[row];if(f<0||f>s.frets)continue;
    const lo=Math.min(route.lo,f),hi=Math.max(route.hi,f);
    const points=route.points.concat({row,fret:f,midi:targets[step],degree:step===targets.length-1?'1':s.scaleData.formula[step]});
    next.push({points,lo,hi,cost:(hi-lo)*12+points.reduce((v,p,i)=>i?v+Math.abs(p.fret-points[i-1].fret)+Math.abs(p.row-points[i-1].row)*.5:v,0)});
   }
  }
  routes=next.sort((a,b)=>a.cost-b.cost).slice(0,96);
 }
 if(!routes.length)return null;
 const route=routes[0];return {...route,startRow,startFret:fret,lo:Math.max(0,route.lo-1),hi:Math.min(s.frets,Math.max(route.hi,route.lo+3))};
}

export function guidePlan(variants,{coverTitle,readTitle,contentsTitle}){
 let extra=0;
 while(variants.length+2+extra>32+extra*48)extra++;
 const entries=[{title:coverTitle,type:'cover'},...Array.from({length:extra},()=>({title:contentsTitle,type:'contents'})),{title:readTitle,type:'reading'},...variants.map(state=>({title:state.title,type:'scale',state}))];
 return {entries:entries.map((entry,i)=>({...entry,number:i+1})),extra,readingPage:extra+2,firstScalePage:extra+3};
}
