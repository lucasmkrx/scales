import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { runInThisContext } from 'node:vm';
import { resolve } from 'node:path';
import { createAtlas } from '../src/pdf.mjs';
const args = Object.fromEntries(
  process.argv.slice(2).map((value) => {
    const i = value.indexOf('=');
    if (i < 0 || !value.startsWith('--')) throw new Error('Use --name=value arguments');
    return [value.slice(2, i), value.slice(i + 1)];
  }),
);
for (const name of ['pdf-lib.min.js', 'fontkit.umd.min.js'])
  runInThisContext(
    await readFile(new URL(`../public/vendor/${name}`, import.meta.url), 'utf8'),
    { filename: name },
  );
const output = resolve(args.output ?? 'work/scales-atlas.pdf');
await mkdir(resolve(output, '..'), { recursive: true });
const bytes = await createAtlas(args, {
  scope: args.scope ?? 'selected',
  allKeys: args.allKeys === 'true',
  asset: async (path) =>
    new Uint8Array(await readFile(new URL(`../public/${path}`, import.meta.url))),
  progress: (n, total) => {
    if (n === total) console.log(`${total} scale(s) rendered`);
  },
});
await writeFile(output, bytes);
console.log(output);
