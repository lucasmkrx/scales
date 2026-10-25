import {cp,mkdir,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
const modules=await Promise.all((await readdir(new URL('src/',root))).filter(name=>name.endsWith('.mjs')).sort().map(async name=>[name,await readFile(new URL(`src/${name}`,root),'utf8')]));
const css=await readFile(new URL('public/styles.css',root),'utf8');
const revision=createHash('sha256').update(JSON.stringify(modules)).update(css).digest('hex').slice(0,12);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(new URL('public/',root),dist,{recursive:true});
await mkdir(new URL('src/',dist),{recursive:true});
// Version the whole module graph, so an updated entry point cannot load stale dependencies.
for(const [name,source] of modules){
 const versioned=source.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,quote,path)=>`${quote}${path}?v=${revision}${quote}`);
 await writeFile(new URL(`src/${name}`,dist),versioned);
}
const html=(await readFile(new URL('public/index.html',root),'utf8')).replace('./src/app.mjs',`./src/app.mjs?v=${revision}`).replace('./styles.css',`./styles.css?v=${revision}`);
await writeFile(new URL('index.html',dist),html);
await writeFile(new URL('.nojekyll',dist),'');
console.log(`Built dist/ (${revision}; relative paths support GitHub Pages project sites).`);
