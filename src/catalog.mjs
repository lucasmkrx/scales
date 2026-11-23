// Musical facts and original educational labels: CC BY 4.0. See CONTENT-LICENSE.md.
const major = [0, 2, 4, 5, 7, 9, 11];
export const mod = (n, d = 12) => ((n % d) + d) % d;
export function mode(intervals, index) {
  return intervals.map((_, j) =>
    mod(intervals[(j + index) % intervals.length] - intervals[index]),
  );
}
export function degreeFormula(intervals) {
  if (intervals.length === 7)
    return intervals.map((v, i) => {
      const d = v - major[i];
      return `${d < 0 ? 'b'.repeat(-d) : '#'.repeat(d)}${i + 1}`;
    });
  const labels = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
  return intervals.map((v) => labels[v]);
}
const catalog = [];
function add(
  id,
  name,
  family,
  intervals,
  formula = degreeFormula(intervals),
  aliases = [],
  modeIndex,
) {
  const scale = { id, name, family, intervals, formula, aliases };
  if (modeIndex !== undefined) scale.modeIndex = modeIndex;
  catalog.push(scale);
}
function modes(base, family, rows) {
  rows.forEach(([id, name, aliases = []], i) =>
    add(id, name, family, mode(base, i), undefined, aliases, i),
  );
}
modes(major, 'major', [
  [
    'major',
    {
      en: 'Major (Ionian)',
      pt: 'Maior (jônio)',
      es: 'Mayor (jónico)',
      it: 'Maggiore (ionica)',
      fr: 'Majeure (mode ionien)',
      de: 'Dur (Ionisch)',
    },
    ['ionian'],
  ],
  [
    'dorian',
    {
      en: 'Dorian',
      pt: 'Dórico',
      es: 'Dórico',
      it: 'Dorico',
      fr: 'Dorien',
      de: 'Dorisch',
    },
  ],
  [
    'phrygian',
    {
      en: 'Phrygian',
      pt: 'Frígio',
      es: 'Frigio',
      it: 'Frigio',
      fr: 'Phrygien',
      de: 'Phrygisch',
    },
  ],
  [
    'lydian',
    { en: 'Lydian', pt: 'Lídio', es: 'Lidio', it: 'Lidio', fr: 'Lydien', de: 'Lydisch' },
  ],
  [
    'mixolydian',
    {
      en: 'Mixolydian',
      pt: 'Mixolídio',
      es: 'Mixolidio',
      it: 'Misolidio',
      fr: 'Mixolydien',
      de: 'Mixolydisch',
    },
  ],
  [
    'natural-minor',
    {
      en: 'Natural minor (Aeolian)',
      pt: 'Menor natural (eólio)',
      es: 'Menor natural (eólico)',
      it: 'Minore naturale (eolia)',
      fr: 'Mineure naturelle (mode éolien)',
      de: 'Natürliches Moll (Äolisch)',
    },
    ['aeolian'],
  ],
  [
    'locrian',
    {
      en: 'Locrian',
      pt: 'Lócrio',
      es: 'Locrio',
      it: 'Locrio',
      fr: 'Locrien',
      de: 'Lokrisch',
    },
  ],
]);
modes([0, 2, 3, 5, 7, 8, 11], 'harmonic-minor', [
  [
    'harmonic-minor',
    {
      en: 'Harmonic minor',
      pt: 'Menor harmônica',
      es: 'Menor armónica',
      it: 'Minore armonica',
      fr: 'Mineure harmonique',
      de: 'Harmonisch Moll',
    },
  ],
  [
    'locrian-natural-6',
    {
      en: 'Locrian natural 6',
      pt: 'Lócrio com sexta maior',
      es: 'Locrio con sexta mayor',
      it: 'Locrio con sesta maggiore',
      fr: 'Locrien à sixte majeure',
      de: 'Lokrisch ♮6',
    },
  ],
  [
    'ionian-augmented',
    {
      en: 'Ionian augmented',
      pt: 'Jônio aumentado',
      es: 'Jónico aumentado',
      it: 'Ionico aumentato',
      fr: 'Ionien augmenté',
      de: 'Ionisch übermäßig',
    },
  ],
  [
    'dorian-sharp-4',
    {
      en: 'Dorian sharp 4',
      pt: 'Dórico com quarta aumentada',
      es: 'Dórico con cuarta aumentada',
      it: 'Dorico con quarta aumentata',
      fr: 'Dorien à quarte augmentée',
      de: 'Dorisch ♯4',
    },
  ],
  [
    'phrygian-dominant',
    {
      en: 'Phrygian dominant',
      pt: 'Frígio dominante',
      es: 'Frigio dominante',
      it: 'Frigio dominante',
      fr: 'Phrygien dominant',
      de: 'Phrygisch dominant',
    },
  ],
  [
    'lydian-sharp-2',
    {
      en: 'Lydian sharp 2',
      pt: 'Lídio com segunda aumentada',
      es: 'Lidio con segunda aumentada',
      it: 'Lidio con seconda aumentata',
      fr: 'Lydien à seconde augmentée',
      de: 'Lydisch ♯2',
    },
  ],
  [
    'ultralocrian',
    {
      en: 'Ultralocrian',
      pt: 'Ultralócrio',
      es: 'Ultralocrio',
      it: 'Ultralocrio',
      fr: 'Ultralocrien',
      de: 'Ultralokrisch',
    },
  ],
]);
modes([0, 2, 3, 5, 7, 9, 11], 'melodic-minor', [
  [
    'melodic-minor',
    {
      en: 'Melodic minor (jazz / ascending)',
      pt: 'Menor melódica (jazz / ascendente)',
      es: 'Menor melódica (jazz / ascendente)',
      it: 'Minore melodica (jazz / ascendente)',
      fr: 'Mineure mélodique (jazz / ascendante)',
      de: 'Melodisch Moll (Jazz / aufsteigend)',
    },
  ],
  [
    'dorian-flat-2',
    {
      en: 'Dorian flat 2',
      pt: 'Dórico com segunda menor',
      es: 'Dórico con segunda menor',
      it: 'Dorico con seconda minore',
      fr: 'Dorien à seconde mineure',
      de: 'Dorisch ♭2',
    },
  ],
  [
    'lydian-augmented',
    {
      en: 'Lydian augmented',
      pt: 'Lídio aumentado',
      es: 'Lidio aumentado',
      it: 'Lidio aumentato',
      fr: 'Lydien augmenté',
      de: 'Lydisch übermäßig',
    },
  ],
  [
    'lydian-dominant',
    {
      en: 'Lydian dominant',
      pt: 'Lídio dominante',
      es: 'Lidio dominante',
      it: 'Lidio dominante',
      fr: 'Lydien dominant',
      de: 'Lydisch dominant',
    },
  ],
  [
    'mixolydian-flat-6',
    {
      en: 'Mixolydian flat 6',
      pt: 'Mixolídio com sexta menor',
      es: 'Mixolidio con sexta menor',
      it: 'Misolidio con sesta minore',
      fr: 'Mixolydien à sixte mineure',
      de: 'Mixolydisch ♭6',
    },
  ],
  [
    'locrian-natural-2',
    {
      en: 'Locrian natural 2',
      pt: 'Lócrio com segunda maior',
      es: 'Locrio con segunda mayor',
      it: 'Locrio con seconda maggiore',
      fr: 'Locrien à seconde majeure',
      de: 'Lokrisch ♮2',
    },
  ],
  [
    'altered',
    {
      en: 'Altered / Super Locrian',
      pt: 'Alterada / superlócrio',
      es: 'Alterada / superlocrio',
      it: 'Alterata / superlocria',
      fr: 'Altérée / superlocrien',
      de: 'Alteriert / Superlokrisch',
    },
  ],
]);
const modeLabel = {
  en: 'mode',
  pt: 'modo',
  es: 'modo',
  it: 'modo',
  fr: 'mode',
  de: 'Modus',
};
for (const [id, name, base] of [
  [
    'harmonic-major',
    {
      en: 'Harmonic major',
      pt: 'Maior harmônica',
      es: 'Mayor armónica',
      it: 'Maggiore armonica',
      fr: 'Majeure harmonique',
      de: 'Harmonisch Dur',
    },
    [0, 2, 4, 5, 7, 8, 11],
  ],
  [
    'double-harmonic',
    {
      en: 'Double harmonic major',
      pt: 'Maior duplamente harmônica',
      es: 'Mayor doble armónica',
      it: 'Maggiore doppia armonica',
      fr: 'Majeure double harmonique',
      de: 'Doppelharmonisch Dur',
    },
    [0, 1, 4, 5, 7, 8, 11],
  ],
]) {
  for (let i = 0; i < 7; i++)
    add(
      i ? `${id}-mode-${i + 1}` : id,
      i
        ? Object.fromEntries(
            Object.entries(name).map(([lang, baseName]) => [
              lang,
              `${baseName} · ${modeLabel[lang]} ${i + 1}`,
            ]),
          )
        : name,
      id,
      mode(base, i),
      undefined,
      [],
      i,
    );
}
for (const row of [
  [
    'major-pentatonic',
    {
      en: 'Major pentatonic',
      pt: 'Pentatônica maior',
      es: 'Pentatónica mayor',
      it: 'Pentatonica maggiore',
      fr: 'Pentatonique majeure',
      de: 'Dur-Pentatonik',
    },
    [0, 2, 4, 7, 9],
    ['1', '2', '3', '5', '6'],
  ],
  [
    'minor-pentatonic',
    {
      en: 'Minor pentatonic',
      pt: 'Pentatônica menor',
      es: 'Pentatónica menor',
      it: 'Pentatonica minore',
      fr: 'Pentatonique mineure',
      de: 'Moll-Pentatonik',
    },
    [0, 3, 5, 7, 10],
    ['1', 'b3', '4', '5', 'b7'],
  ],
  [
    'egyptian',
    {
      en: 'Egyptian / suspended pentatonic',
      pt: 'Pentatônica egípcia / suspensa',
      es: 'Pentatónica egipcia / suspendida',
      it: 'Pentatonica egizia / sospesa',
      fr: 'Pentatonique égyptienne / suspendue',
      de: 'Ägyptische Pentatonik / Suspended-Pentatonik',
    },
    [0, 2, 5, 7, 10],
    ['1', '2', '4', '5', 'b7'],
  ],
  [
    'ritusen',
    {
      en: 'Ritusen',
      pt: 'Ritusen',
      es: 'Ritusen',
      it: 'Ritusen',
      fr: 'Ritusen',
      de: 'Ritusen',
    },
    [0, 2, 5, 7, 9],
    ['1', '2', '4', '5', '6'],
  ],
  [
    'hirajoshi',
    {
      en: 'Hirajoshi',
      pt: 'Hirajoshi',
      es: 'Hirajoshi',
      it: 'Hirajoshi',
      fr: 'Hirajoshi',
      de: 'Hirajoshi',
    },
    [0, 2, 3, 7, 8],
    ['1', '2', 'b3', '5', 'b6'],
  ],
  [
    'in-sen',
    {
      en: 'In sen',
      pt: 'In sen',
      es: 'In sen',
      it: 'In sen',
      fr: 'In sen',
      de: 'In sen',
    },
    [0, 1, 5, 7, 10],
    ['1', 'b2', '4', '5', 'b7'],
  ],
  [
    'iwato',
    { en: 'Iwato', pt: 'Iwato', es: 'Iwato', it: 'Iwato', fr: 'Iwato', de: 'Iwato' },
    [0, 1, 5, 6, 10],
    ['1', 'b2', '4', 'b5', 'b7'],
  ],
  [
    'kumoi',
    { en: 'Kumoi', pt: 'Kumoi', es: 'Kumoi', it: 'Kumoi', fr: 'Kumoi', de: 'Kumoi' },
    [0, 2, 3, 7, 9],
    ['1', '2', 'b3', '5', '6'],
  ],
  [
    'pelog',
    {
      en: 'Pelog pentatonic (12-TET approximation)',
      pt: 'Pelog pentatônica (aproximação em 12-TET)',
      es: 'Pelog pentatónica (aproximación en 12-TET)',
      it: 'Pentatonica pelog (approssimazione in 12-TET)',
      fr: 'Pentatonique pélog (approximation en tempérament égal)',
      de: 'Pelog-Pentatonik (gleichstufig angenähert)',
    },
    [0, 1, 3, 7, 8],
    ['1', 'b2', 'b3', '5', 'b6'],
  ],
])
  add(row[0], row[1], 'pentatonic', row[2], row[3]);
add(
  'minor-blues',
  {
    en: 'Minor blues',
    pt: 'Blues menor',
    es: 'Blues menor',
    it: 'Blues minore',
    fr: 'Blues mineur',
    de: 'Moll-Blues',
  },
  'blues',
  [0, 3, 5, 6, 7, 10],
  ['1', 'b3', '4', 'b5', '5', 'b7'],
);
add(
  'major-blues',
  {
    en: 'Major blues',
    pt: 'Blues maior',
    es: 'Blues mayor',
    it: 'Blues maggiore',
    fr: 'Blues majeur',
    de: 'Dur-Blues',
  },
  'blues',
  [0, 2, 3, 4, 7, 9],
  ['1', '2', 'b3', '3', '5', '6'],
);
for (const row of [
  [
    'whole-tone',
    {
      en: 'Whole tone',
      pt: 'Tons inteiros',
      es: 'Tonos enteros',
      it: 'Scala per toni interi',
      fr: 'Gamme par tons',
      de: 'Ganztonleiter',
    },
    [0, 2, 4, 6, 8, 10],
    ['1', '2', '3', '#4', '#5', 'b7'],
  ],
  [
    'diminished-wh',
    {
      en: 'Diminished (whole-half)',
      pt: 'Diminuta (tom-semitom)',
      es: 'Disminuida (tono-semitono)',
      it: 'Diminuita (tono-semitono)',
      fr: 'Diminuée (ton–demi-ton)',
      de: 'Vermindert (Ganzton–Halbton)',
    },
    [0, 2, 3, 5, 6, 8, 9, 11],
    ['1', '2', 'b3', '4', 'b5', 'b6', '6', '7'],
  ],
  [
    'diminished-hw',
    {
      en: 'Diminished (half-whole)',
      pt: 'Diminuta (semitom-tom)',
      es: 'Disminuida (semitono-tono)',
      it: 'Diminuita (semitono-tono)',
      fr: 'Diminuée (demi-ton–ton)',
      de: 'Vermindert (Halbton–Ganzton)',
    },
    [0, 1, 3, 4, 6, 7, 9, 10],
    ['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7'],
  ],
  [
    'augmented',
    {
      en: 'Augmented',
      pt: 'Aumentada',
      es: 'Aumentada',
      it: 'Aumentata',
      fr: 'Augmentée',
      de: 'Übermäßige Tonleiter',
    },
    [0, 3, 4, 7, 8, 11],
    ['1', '#2', '3', '5', '#5', '7'],
  ],
  [
    'chromatic',
    {
      en: 'Chromatic',
      pt: 'Cromática',
      es: 'Cromática',
      it: 'Cromatica',
      fr: 'Chromatique',
      de: 'Chromatisch',
    },
    Array.from({ length: 12 }, (_, i) => i),
  ],
  [
    'prometheus',
    {
      en: 'Prometheus',
      pt: 'Prometeu',
      es: 'Prometeo',
      it: 'Prometeo',
      fr: 'Prométhée',
      de: 'Prometheus',
    },
    [0, 2, 4, 6, 9, 10],
    ['1', '2', '3', '#4', '6', 'b7'],
  ],
])
  add(row[0], row[1], 'symmetric', row[2], row[3]);
for (const row of [
  [
    'bebop-dominant',
    {
      en: 'Dominant bebop',
      pt: 'Bebop dominante',
      es: 'Bebop dominante',
      it: 'Bebop dominante',
      fr: 'Bebop dominante',
      de: 'Dominant-Bebop',
    },
    [0, 2, 4, 5, 7, 9, 10, 11],
    ['1', '2', '3', '4', '5', '6', 'b7', '7'],
  ],
  [
    'bebop-major',
    {
      en: 'Major bebop',
      pt: 'Bebop maior',
      es: 'Bebop mayor',
      it: 'Bebop maggiore',
      fr: 'Bebop majeure',
      de: 'Dur-Bebop',
    },
    [0, 2, 4, 5, 7, 8, 9, 11],
    ['1', '2', '3', '4', '5', 'b6', '6', '7'],
  ],
  [
    'bebop-dorian',
    {
      en: 'Dorian bebop',
      pt: 'Bebop dórico',
      es: 'Bebop dórico',
      it: 'Bebop dorica',
      fr: 'Bebop dorienne',
      de: 'Dorisch Bebop',
    },
    [0, 2, 3, 4, 5, 7, 9, 10],
    ['1', '2', 'b3', '3', '4', '5', '6', 'b7'],
  ],
])
  add(row[0], row[1], 'bebop', row[2], row[3]);
for (const row of [
  [
    'major-triad',
    {
      en: 'Major triad',
      pt: 'Tríade maior',
      es: 'Tríada mayor',
      it: 'Triade maggiore',
      fr: 'Triade majeure',
      de: 'Dur-Dreiklang',
    },
    [0, 4, 7],
    ['1', '3', '5'],
  ],
  [
    'minor-triad',
    {
      en: 'Minor triad',
      pt: 'Tríade menor',
      es: 'Tríada menor',
      it: 'Triade minore',
      fr: 'Triade mineure',
      de: 'Moll-Dreiklang',
    },
    [0, 3, 7],
    ['1', 'b3', '5'],
  ],
  [
    'diminished-triad',
    {
      en: 'Diminished triad',
      pt: 'Tríade diminuta',
      es: 'Tríada disminuida',
      it: 'Triade diminuita',
      fr: 'Triade diminuée',
      de: 'Verminderter Dreiklang',
    },
    [0, 3, 6],
    ['1', 'b3', 'b5'],
  ],
  [
    'augmented-triad',
    {
      en: 'Augmented triad',
      pt: 'Tríade aumentada',
      es: 'Tríada aumentada',
      it: 'Triade aumentata',
      fr: 'Triade augmentée',
      de: 'Übermäßiger Dreiklang',
    },
    [0, 4, 8],
    ['1', '3', '#5'],
  ],
  [
    'major-7',
    {
      en: 'Major seventh',
      pt: 'Maior com sétima maior',
      es: 'Mayor con séptima mayor',
      it: 'Settima maggiore',
      fr: 'Accord majeur de septième majeure',
      de: 'Dur mit großer Septime',
    },
    [0, 4, 7, 11],
    ['1', '3', '5', '7'],
  ],
  [
    'dominant-7',
    {
      en: 'Dominant seventh',
      pt: 'Sétima de dominante',
      es: 'Séptima de dominante',
      it: 'Settima di dominante',
      fr: 'Septième de dominante',
      de: 'Dominantseptakkord',
    },
    [0, 4, 7, 10],
    ['1', '3', '5', 'b7'],
  ],
  [
    'minor-7',
    {
      en: 'Minor seventh',
      pt: 'Menor com sétima menor',
      es: 'Menor con séptima menor',
      it: 'Minore settima',
      fr: 'Accord mineur de septième mineure',
      de: 'Moll mit kleiner Septime',
    },
    [0, 3, 7, 10],
    ['1', 'b3', '5', 'b7'],
  ],
  [
    'half-diminished',
    {
      en: 'Half-diminished seventh',
      pt: 'Meio-diminuto',
      es: 'Semidisminuido',
      it: 'Settima semidiminuita',
      fr: 'Septième demi-diminuée',
      de: 'Halbverminderter Septakkord',
    },
    [0, 3, 6, 10],
    ['1', 'b3', 'b5', 'b7'],
  ],
  [
    'diminished-7',
    {
      en: 'Diminished seventh',
      pt: 'Sétima diminuta',
      es: 'Séptima disminuida',
      it: 'Settima diminuita',
      fr: 'Septième diminuée',
      de: 'Verminderter Septakkord',
    },
    [0, 3, 6, 9],
    ['1', 'b3', 'b5', 'bb7'],
  ],
  [
    'minor-major-7',
    {
      en: 'Minor-major seventh',
      pt: 'Menor com sétima maior',
      es: 'Menor con séptima mayor',
      it: 'Minore con settima maggiore',
      fr: 'Accord mineur de septième majeure',
      de: 'Moll mit großer Septime',
    },
    [0, 3, 7, 11],
    ['1', 'b3', '5', '7'],
  ],
  [
    'sus2',
    {
      en: 'Suspended second',
      pt: 'Suspenso com segunda',
      es: 'Suspendido de segunda',
      it: 'Accordo sospeso di seconda',
      fr: 'Accord suspendu de seconde',
      de: 'Sus2-Akkord',
    },
    [0, 2, 7],
    ['1', '2', '5'],
  ],
  [
    'sus4',
    {
      en: 'Suspended fourth',
      pt: 'Suspenso com quarta',
      es: 'Suspendido de cuarta',
      it: 'Accordo sospeso di quarta',
      fr: 'Accord suspendu de quarte',
      de: 'Sus4-Akkord',
    },
    [0, 5, 7],
    ['1', '4', '5'],
  ],
])
  add(row[0], row[1], 'arpeggio', row[2], row[3]);
export const SCALES = Object.freeze(catalog.map((s) => Object.freeze(s)));
const ts = [];
function tuning(id, instrument, strings, name, notes, preferred = 'sharp') {
  ts.push({ id, instrument, strings, name, notes, preferred });
}
for (const [id, name, notes, prefer] of [
  ['standard', 'E standard', [40, 45, 50, 55, 59, 64]],
  ['eb-standard', 'E♭ standard', [39, 44, 49, 54, 58, 63], 'flat'],
  ['d-standard', 'D standard', [38, 43, 48, 53, 57, 62]],
  ['c-sharp-standard', 'C♯ standard', [37, 42, 47, 52, 56, 61]],
  ['c-standard', 'C standard', [36, 41, 46, 51, 55, 60]],
  ['b-standard', 'B standard', [35, 40, 45, 50, 54, 59]],
  ['drop-d', 'Drop D', [38, 45, 50, 55, 59, 64]],
  ['drop-c-sharp', 'Drop C♯', [37, 44, 49, 54, 58, 63]],
  ['drop-c', 'Drop C', [36, 43, 48, 53, 57, 62]],
  ['drop-b', 'Drop B', [35, 42, 47, 52, 56, 61]],
  ['drop-a', 'Drop A', [33, 40, 45, 50, 54, 59]],
  ['dadgad', 'DADGAD', [38, 45, 50, 55, 57, 62]],
  ['open-d', 'Open D', [38, 45, 50, 54, 57, 62]],
  ['open-g', 'Open G', [38, 43, 50, 55, 59, 62]],
  ['open-e', 'Open E', [40, 47, 52, 56, 59, 64]],
  ['open-c', 'Open C', [36, 43, 48, 55, 60, 64]],
  ['double-drop-d', 'Double drop D', [38, 45, 50, 55, 59, 62]],
])
  tuning(`guitar-${id}`, 'guitar', 6, name, notes, prefer);
for (const [id, name, notes, prefer] of [
  ['standard', 'B standard', [35, 40, 45, 50, 55, 59, 64]],
  ['bb-standard', 'B♭ standard', [34, 39, 44, 49, 54, 58, 63], 'flat'],
  ['a-standard', 'A standard', [33, 38, 43, 48, 53, 57, 62]],
  ['drop-a', 'Drop A', [33, 40, 45, 50, 55, 59, 64]],
  ['drop-ab', 'Drop A♭ / G♯', [32, 39, 44, 49, 54, 58, 63], 'flat'],
  ['drop-g', 'Drop G', [31, 38, 43, 48, 53, 57, 62]],
])
  tuning(`guitar-7-${id}`, 'guitar', 7, name, notes, prefer);
for (const [id, name, notes, prefer] of [
  ['standard', 'E standard', [28, 33, 38, 43]],
  ['eb-standard', 'E♭ standard', [27, 32, 37, 42], 'flat'],
  ['d-standard', 'D standard', [26, 31, 36, 41]],
  ['c-sharp-standard', 'C♯ standard', [25, 30, 35, 40]],
  ['c-standard', 'C standard', [24, 29, 34, 39]],
  ['bead', 'B standard / BEAD', [23, 28, 33, 38]],
  ['drop-d', 'Drop D', [26, 33, 38, 43]],
  ['drop-c-sharp', 'Drop C♯', [25, 32, 37, 42]],
  ['drop-c', 'Drop C', [24, 31, 36, 41]],
  ['drop-b', 'Drop B', [23, 30, 35, 40]],
])
  tuning(`bass-4-${id}`, 'bass', 4, name, notes, prefer);
for (const [id, name, notes, prefer] of [
  ['standard', 'B standard', [23, 28, 33, 38, 43]],
  ['high-c', 'High C / EADGC', [28, 33, 38, 43, 48]],
  ['bb-standard', 'B♭ standard', [22, 27, 32, 37, 42], 'flat'],
  ['a-standard', 'A standard', [21, 26, 31, 36, 41]],
  ['drop-a', 'Drop A', [21, 28, 33, 38, 43]],
  ['drop-g', 'Drop G', [19, 26, 31, 36, 41]],
])
  tuning(`bass-5-${id}`, 'bass', 5, name, notes, prefer);
for (const [id, name, notes, prefer] of [
  ['standard', 'B standard', [23, 28, 33, 38, 43, 48]],
  ['bb-standard', 'B♭ standard', [22, 27, 32, 37, 42, 47], 'flat'],
  ['a-standard', 'A standard', [21, 26, 31, 36, 41, 46]],
  ['drop-a', 'Drop A', [21, 28, 33, 38, 43, 48]],
  ['drop-g', 'Drop G', [19, 26, 31, 36, 41, 46]],
])
  tuning(`bass-6-${id}`, 'bass', 6, name, notes, prefer);
export const TUNINGS = Object.freeze(ts.map((t) => Object.freeze(t)));
export const FAMILIES = {
  major: {
    en: 'Major & modes',
    pt: 'Maior e modos',
    es: 'Mayor y modos',
    it: 'Maggiore e modi',
    fr: 'Gamme majeure et modes',
    de: 'Dur und Modi',
  },
  'harmonic-minor': {
    en: 'Harmonic minor & modes',
    pt: 'Menor harmônica e modos',
    es: 'Menor armónica y modos',
    it: 'Minore armonica e modi',
    fr: 'Mineure harmonique et modes',
    de: 'Harmonisch Moll und Modi',
  },
  'melodic-minor': {
    en: 'Melodic minor & modes',
    pt: 'Menor melódica e modos',
    es: 'Menor melódica y modos',
    it: 'Minore melodica e modi',
    fr: 'Mineure mélodique et modes',
    de: 'Melodisch Moll und Modi',
  },
  'harmonic-major': {
    en: 'Harmonic major & modes',
    pt: 'Maior harmônica e modos',
    es: 'Mayor armónica y modos',
    it: 'Maggiore armonica e modi',
    fr: 'Majeure harmonique et modes',
    de: 'Harmonisch Dur und Modi',
  },
  'double-harmonic': {
    en: 'Double harmonic major & modes',
    pt: 'Maior duplamente harmônica e modos',
    es: 'Mayor doble armónica y modos',
    it: 'Maggiore doppia armonica e modi',
    fr: 'Majeure double harmonique et modes',
    de: 'Doppelharmonisch Dur und Modi',
  },
  pentatonic: {
    en: 'Pentatonic',
    pt: 'Pentatônicas',
    es: 'Pentatónicas',
    it: 'Pentatoniche',
    fr: 'Pentatoniques',
    de: 'Pentatonik',
  },
  blues: { en: 'Blues', pt: 'Blues', es: 'Blues', it: 'Blues', fr: 'Blues', de: 'Blues' },
  symmetric: {
    en: 'Symmetric & other',
    pt: 'Simétricas e outras',
    es: 'Simétricas y otras',
    it: 'Simmetriche e altre',
    fr: 'Symétriques et autres',
    de: 'Symmetrische und weitere Tonleitern',
  },
  bebop: { en: 'Bebop', pt: 'Bebop', es: 'Bebop', it: 'Bebop', fr: 'Bebop', de: 'Bebop' },
  arpeggio: {
    en: 'Chord arpeggios',
    pt: 'Arpejos de acordes',
    es: 'Arpegios de acordes',
    it: 'Arpeggi di accordi',
    fr: 'Arpèges d’accords',
    de: 'Akkordarpeggien',
  },
};
