// Musical facts and original educational labels: CC BY 4.0. See CONTENT-LICENSE.md.
const major = [0, 2, 4, 5, 7, 9, 11];
export const mod = (n, d = 12) => ((n % d) + d) % d;
export function mode(intervals, index) {
  return intervals.map((_, j) => mod(intervals[(j + index) % intervals.length] - intervals[index]));
}
export function degreeFormula(intervals) {
  if (intervals.length === 7) return intervals.map((v, i) => {
    const d = v - major[i]; return `${d < 0 ? 'b'.repeat(-d) : '#'.repeat(d)}${i + 1}`;
  });
  const labels = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
  return intervals.map(v => labels[v]);
}
const catalog = [];
function add(id, en, pt, family, intervals, formula = degreeFormula(intervals), aliases = []) {
  catalog.push({ id, name: { en, pt }, family, intervals, formula, aliases });
}
function modes(base, family, rows) {
  rows.forEach(([id, en, pt, aliases = []], i) => add(id, en, pt, family, mode(base, i), undefined, aliases));
}
modes(major, 'major', [
  ['major', 'Major (Ionian)', 'Maior (jônio)', ['ionian']], ['dorian', 'Dorian', 'Dórico'],
  ['phrygian', 'Phrygian', 'Frígio'], ['lydian', 'Lydian', 'Lídio'], ['mixolydian', 'Mixolydian', 'Mixolídio'],
  ['natural-minor', 'Natural minor (Aeolian)', 'Menor natural (eólio)', ['aeolian']], ['locrian', 'Locrian', 'Lócrio']
]);
modes([0, 2, 3, 5, 7, 8, 11], 'harmonic-minor', [
  ['harmonic-minor', 'Harmonic minor', 'Menor harmônica'], ['locrian-natural-6', 'Locrian natural 6', 'Lócrio com sexta maior'],
  ['ionian-augmented', 'Ionian augmented', 'Jônio aumentado'], ['dorian-sharp-4', 'Dorian sharp 4', 'Dórico com quarta aumentada'],
  ['phrygian-dominant', 'Phrygian dominant', 'Frígio dominante'], ['lydian-sharp-2', 'Lydian sharp 2', 'Lídio com segunda aumentada'],
  ['ultralocrian', 'Ultralocrian', 'Ultralócrio']
]);
modes([0, 2, 3, 5, 7, 9, 11], 'melodic-minor', [
  ['melodic-minor', 'Melodic minor (jazz / ascending)', 'Menor melódica (jazz / ascendente)'],
  ['dorian-flat-2', 'Dorian flat 2', 'Dórico com segunda menor'], ['lydian-augmented', 'Lydian augmented', 'Lídio aumentado'],
  ['lydian-dominant', 'Lydian dominant', 'Lídio dominante'], ['mixolydian-flat-6', 'Mixolydian flat 6', 'Mixolídio com sexta menor'],
  ['locrian-natural-2', 'Locrian natural 2', 'Lócrio com segunda maior'], ['altered', 'Altered / Super Locrian', 'Alterada / superlócrio']
]);
for (const [id, en, pt, base] of [
  ['harmonic-major', 'Harmonic major', 'Maior harmônica', [0, 2, 4, 5, 7, 8, 11]],
  ['double-harmonic', 'Double harmonic major', 'Maior duplamente harmônica', [0, 1, 4, 5, 7, 8, 11]]
]) {
  for (let i = 0; i < 7; i++) add(i ? `${id}-mode-${i + 1}` : id, i ? `${en}: mode ${i + 1}` : en,
    i ? `${pt}: modo ${i + 1}` : pt, id, mode(base, i));
}
for (const row of [
  ['major-pentatonic', 'Major pentatonic', 'Pentatônica maior', [0,2,4,7,9], ['1','2','3','5','6']],
  ['minor-pentatonic', 'Minor pentatonic', 'Pentatônica menor', [0,3,5,7,10], ['1','b3','4','5','b7']],
  ['egyptian', 'Egyptian pentatonic', 'Pentatônica egípcia', [0,2,5,7,10], ['1','2','4','5','b7']],
  ['ritusen', 'Ritusen', 'Ritusen', [0,2,5,7,9], ['1','2','4','5','6']],
  ['hirajoshi', 'Hirajoshi', 'Hirajoshi', [0,2,3,7,8], ['1','2','b3','5','b6']],
  ['in-sen', 'In sen', 'In sen', [0,1,5,7,10], ['1','b2','4','5','b7']],
  ['iwato', 'Iwato', 'Iwato', [0,1,5,6,10], ['1','b2','4','b5','b7']],
  ['kumoi', 'Kumoi', 'Kumoi', [0,2,3,7,9], ['1','2','b3','5','6']],
  ['pelog', 'Pelog (12-tone approximation)', 'Pelog (aproximação em 12 sons)', [0,1,3,7,8], ['1','b2','b3','5','b6']]
]) add(row[0], row[1], row[2], 'pentatonic', row[3], row[4]);
add('minor-blues','Minor blues','Blues menor','blues',[0,3,5,6,7,10],['1','b3','4','b5','5','b7']);
add('major-blues','Major blues','Blues maior','blues',[0,2,3,4,7,9],['1','2','b3','3','5','6']);
for (const row of [
  ['whole-tone','Whole tone','Tons inteiros',[0,2,4,6,8,10],['1','2','3','#4','#5','b7']],
  ['diminished-wh','Diminished (whole-half)','Diminuta (tom-semitom)',[0,2,3,5,6,8,9,11],['1','2','b3','4','b5','b6','6','7']],
  ['diminished-hw','Diminished (half-whole)','Diminuta (semitom-tom)',[0,1,3,4,6,7,9,10],['1','b2','b3','3','#4','5','6','b7']],
  ['augmented','Augmented','Aumentada',[0,3,4,7,8,11],['1','#2','3','5','#5','7']],
  ['chromatic','Chromatic','Cromática',Array.from({length:12},(_,i)=>i)],
  ['prometheus','Prometheus','Prometeu',[0,2,4,6,9,10],['1','2','3','#4','6','b7']]
]) add(row[0],row[1],row[2],'symmetric',row[3],row[4]);
for (const row of [
  ['bebop-dominant','Dominant bebop','Bebop dominante',[0,2,4,5,7,9,10,11],['1','2','3','4','5','6','b7','7']],
  ['bebop-major','Major bebop','Bebop maior',[0,2,4,5,7,8,9,11],['1','2','3','4','5','b6','6','7']],
  ['bebop-dorian','Dorian bebop','Bebop dórico',[0,2,3,4,5,7,9,10],['1','2','b3','3','4','5','6','b7']]
]) add(row[0],row[1],row[2],'bebop',row[3],row[4]);
for (const row of [
  ['major-triad','Major triad','Tríade maior',[0,4,7],['1','3','5']],
  ['minor-triad','Minor triad','Tríade menor',[0,3,7],['1','b3','5']],
  ['diminished-triad','Diminished triad','Tríade diminuta',[0,3,6],['1','b3','b5']],
  ['augmented-triad','Augmented triad','Tríade aumentada',[0,4,8],['1','3','#5']],
  ['major-7','Major seventh','Sétima maior',[0,4,7,11],['1','3','5','7']],
  ['dominant-7','Dominant seventh','Sétima dominante',[0,4,7,10],['1','3','5','b7']],
  ['minor-7','Minor seventh','Menor com sétima',[0,3,7,10],['1','b3','5','b7']],
  ['half-diminished','Half-diminished seventh','Meio-diminuto',[0,3,6,10],['1','b3','b5','b7']],
  ['diminished-7','Diminished seventh','Sétima diminuta',[0,3,6,9],['1','b3','b5','bb7']],
  ['minor-major-7','Minor-major seventh','Menor com sétima maior',[0,3,7,11],['1','b3','5','7']],
  ['sus2','Suspended second','Suspenso com segunda',[0,2,7],['1','2','5']],
  ['sus4','Suspended fourth','Suspenso com quarta',[0,5,7],['1','4','5']]
]) add(row[0],row[1],row[2],'arpeggio',row[3],row[4]);
export const SCALES = Object.freeze(catalog.map(s => Object.freeze(s)));
const ts=[];
function tuning(id,instrument,strings,name,notes,preferred='sharp') { ts.push({id,instrument,strings,name,notes,preferred}); }
for (const [id,name,notes,prefer] of [
 ['standard','E standard',[40,45,50,55,59,64]],['eb-standard','E♭ standard',[39,44,49,54,58,63],'flat'],
 ['d-standard','D standard',[38,43,48,53,57,62]],['c-sharp-standard','C♯ standard',[37,42,47,52,56,61]],
 ['c-standard','C standard',[36,41,46,51,55,60]],['b-standard','B standard',[35,40,45,50,54,59]],
 ['drop-d','Drop D',[38,45,50,55,59,64]],['drop-c-sharp','Drop C♯',[37,44,49,54,58,63]],
 ['drop-c','Drop C',[36,43,48,53,57,62]],['drop-b','Drop B',[35,42,47,52,56,61]],['drop-a','Drop A',[33,40,45,50,54,59]],
 ['dadgad','DADGAD',[38,45,50,55,57,62]],['open-d','Open D',[38,45,50,54,57,62]],
 ['open-g','Open G',[38,43,50,55,59,62]],['open-e','Open E',[40,47,52,56,59,64]],
 ['open-c','Open C',[36,43,48,55,60,64]],['double-drop-d','Double drop D',[38,45,50,55,59,62]]
]) tuning(`guitar-${id}`,'guitar',6,name,notes,prefer);
for (const [id,name,notes,prefer] of [
 ['standard','B standard',[35,40,45,50,55,59,64]],
 ['bb-standard','B♭ standard',[34,39,44,49,54,58,63],'flat'],
 ['a-standard','A standard',[33,38,43,48,53,57,62]],
 ['drop-a','Drop A',[33,40,45,50,55,59,64]],
 ['drop-ab','Drop A♭ / G♯',[32,39,44,49,54,58,63],'flat'],
 ['drop-g','Drop G',[31,38,43,48,53,57,62]]
]) tuning(`guitar-7-${id}`,'guitar',7,name,notes,prefer);
for (const [id,name,notes,prefer] of [
 ['standard','E standard',[28,33,38,43]],['eb-standard','E♭ standard',[27,32,37,42],'flat'],
 ['d-standard','D standard',[26,31,36,41]],['c-sharp-standard','C♯ standard',[25,30,35,40]],
 ['c-standard','C standard',[24,29,34,39]],['bead','B standard / BEAD',[23,28,33,38]],
 ['drop-d','Drop D',[26,33,38,43]],['drop-c-sharp','Drop C♯',[25,32,37,42]],
 ['drop-c','Drop C',[24,31,36,41]],['drop-b','Drop B',[23,30,35,40]]
]) tuning(`bass-4-${id}`,'bass',4,name,notes,prefer);
for (const [id,name,notes,prefer] of [
 ['standard','B standard',[23,28,33,38,43]],['high-c','High C / EADGC',[28,33,38,43,48]],
 ['bb-standard','B♭ standard',[22,27,32,37,42],'flat'],['a-standard','A standard',[21,26,31,36,41]],
 ['drop-a','Drop A',[21,28,33,38,43]],['drop-g','Drop G',[19,26,31,36,41]]
]) tuning(`bass-5-${id}`,'bass',5,name,notes,prefer);
for (const [id,name,notes,prefer] of [
 ['standard','B standard',[23,28,33,38,43,48]],['bb-standard','B♭ standard',[22,27,32,37,42,47],'flat'],
 ['a-standard','A standard',[21,26,31,36,41,46]],['drop-a','Drop A',[21,28,33,38,43,48]],['drop-g','Drop G',[19,26,31,36,41,46]]
]) tuning(`bass-6-${id}`,'bass',6,name,notes,prefer);
export const TUNINGS=Object.freeze(ts.map(t=>Object.freeze(t)));
export const FAMILIES={
 major:{en:'Major & modes',pt:'Maior e modos'},'harmonic-minor':{en:'Harmonic minor & modes',pt:'Menor harmônica e modos'},
 'melodic-minor':{en:'Melodic minor & modes',pt:'Menor melódica e modos'},'harmonic-major':{en:'Harmonic major & modes',pt:'Maior harmônica e modos'},
 'double-harmonic':{en:'Double harmonic & modes',pt:'Duplamente harmônica e modos'},pentatonic:{en:'Pentatonic',pt:'Pentatônicas'},
 blues:{en:'Blues',pt:'Blues'},symmetric:{en:'Symmetric & other',pt:'Simétricas e outras'},bebop:{en:'Bebop',pt:'Bebop'},arpeggio:{en:'Chord arpeggios',pt:'Arpejos de acordes'}
};
