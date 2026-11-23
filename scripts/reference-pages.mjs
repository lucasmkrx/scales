import { escape } from '../src/board.mjs';
import { FAMILIES, SCALES } from '../src/catalog.mjs';
import { copy } from '../src/i18n.mjs';
import { prettyDegree, spellDegree } from '../src/music.mjs';
import { routes, siteOrigin } from '../src/site.mjs';
import { license, readingPage } from './reading-page.mjs';

export const referenceCopy = {
  en: {
    title: 'Guitar and bass scale formulas',
    linkLabel: 'Scale and arpeggio reference',
    description:
      'Look up scale and arpeggio formulas, see the notes in a sample key, and open each example on a guitar or bass fretboard.',
    intro:
      'A formula tells you which notes to play from any root. Read each degree against the major scale with the same root. In A, the third degree is C♯, so ♭3 is C. The A minor pentatonic formula 1 ♭3 4 5 ♭7 gives A C D E G.',
    directions:
      'Choose a family, then open an example on six-string guitar or four-string bass in standard tuning. You can change the root or tuning on the fretboard.',
    families: 'Browse by family',
    formula: 'Degrees',
    example: 'Notes in',
    practice: 'How to practice these scales',
    familyLink: 'Back to families',
    descriptions: {
      major:
        'Compare A Dorian and A natural minor. Raising the sixth from F to F♯ gives Dorian its characteristic sound.',
      'harmonic-minor':
        'A harmonic minor has G♯ a half step below A. Listen to how strongly that seventh pulls back to the root.',
      'melodic-minor':
        'The examples use the ascending melodic minor form. In A, F♯ and G♯ give you a major sixth and seventh above a minor third.',
      'harmonic-major':
        'Lower the sixth of C major from A to A♭. The interval between A♭ and B spans three frets on one string.',
      'double-harmonic':
        'C double harmonic major has two three-semitone steps, D♭ to E and A♭ to B. The modes start at different degrees of that pattern.',
      pentatonic:
        'Compare the five degrees of major and minor pentatonic. The minor form omits the second and sixth of natural minor.',
      blues:
        'A minor blues adds E♭ between D and E in A minor pentatonic. Play those three notes slowly to hear the added passing tone.',
      symmetric:
        'Whole tone moves in whole steps. The two diminished scales alternate whole and half steps, with different starting steps.',
      bebop:
        'Bebop scales here include eight notes. In C dominant bebop, B sits between B♭ and the returning C.',
      arpeggio:
        'An arpeggio sounds the notes of a chord one at a time. Compare C major seventh and C dominant seventh. Listen for the change from B to B♭.',
    },
  },
  pt: {
    title: 'Fórmulas de escalas para guitarra e baixo',
    linkLabel: 'Referência de escalas e arpejos',
    description:
      'Consulte fórmulas de escalas e arpejos, veja as notas em uma tonalidade e abra cada exemplo no braço da guitarra ou do baixo.',
    intro:
      'A fórmula mostra quais notas tocar a partir de qualquer tônica. Use como referência a escala maior dessa tônica. Em lá, o terceiro grau é C♯, então ♭3 é C. A fórmula 1 ♭3 4 5 ♭7 da pentatônica menor de lá resulta em A C D E G.',
    directions:
      'Escolha uma família e abra um exemplo na guitarra de seis cordas ou no baixo de quatro cordas em afinação padrão. No braço, você pode mudar a tônica ou a afinação.',
    families: 'Navegar por família',
    formula: 'Graus',
    example: 'Notas em',
    practice: 'Como praticar estas escalas',
    familyLink: 'Voltar às famílias',
    descriptions: {
      major:
        'Compare lá dórico com lá menor natural. Subir o sexto grau de F para F♯ dá ao modo dórico seu som característico.',
      'harmonic-minor':
        'Na menor harmônica de lá, G♯ fica um semitom abaixo de A. Ouça como o sétimo grau conduz de volta à tônica.',
      'melodic-minor':
        'Os exemplos usam a forma ascendente da menor melódica. Em lá, a terça é menor, enquanto a sexta (F♯) e a sétima (G♯) são maiores.',
      'harmonic-major':
        'Abaixe o sexto grau de dó maior de A para A♭. A distância entre A♭ e B é de três casas na mesma corda.',
      'double-harmonic':
        'A maior duplamente harmônica de dó tem dois passos de três semitons, de D♭ a E e de A♭ a B. Cada modo começa em um grau diferente dessa sequência.',
      pentatonic:
        'Compare os cinco graus da pentatônica maior e da menor. A forma menor omite o segundo e o sexto graus da escala menor natural.',
      blues:
        'O blues menor de lá acrescenta E♭ entre D e E à pentatônica menor. Toque essas três notas devagar para ouvir a nota de passagem.',
      symmetric:
        'A escala de tons inteiros avança de tom em tom. As duas diminutas alternam tons e semitons, começando por intervalos diferentes.',
      bebop:
        'Estas escalas bebop têm oito notas. No bebop dominante de dó, B fica entre B♭ e a volta à tônica C.',
      arpeggio:
        'Em um arpejo, as notas de um acorde soam uma de cada vez. Compare Cmaj7 e C7. Só a sétima muda.',
    },
  },
  es: {
    title: 'Fórmulas de escalas para guitarra y bajo',
    linkLabel: 'Referencia de escalas y arpegios',
    description:
      'Consulta fórmulas de escalas y arpegios, ve las notas en una tonalidad y abre cada ejemplo en el diapasón de la guitarra o del bajo.',
    intro:
      'La fórmula indica qué notas tocar a partir de cualquier tónica. Toma como referencia la escala mayor de esa tónica. En la, el tercer grado es C♯, así que ♭3 es C. La fórmula 1 ♭3 4 5 ♭7 de la pentatónica menor de la da las notas A C D E G.',
    directions:
      'Elige una familia y abre un ejemplo en guitarra de seis cuerdas o bajo de cuatro cuerdas con afinación estándar. En el diapasón puedes cambiar la tónica o la afinación.',
    families: 'Explorar por familia',
    formula: 'Grados',
    example: 'Notas en',
    practice: 'Cómo practicar estas escalas',
    familyLink: 'Volver a las familias',
    descriptions: {
      major:
        'Compara el modo dórico de la con la escala menor natural de la. Al subir el sexto grado de F a F♯, oirás el sonido característico del modo dórico.',
      'harmonic-minor':
        'En la escala menor armónica de la, G♯ está un semitono por debajo de A. Escucha cómo el séptimo grado te lleva de vuelta a la tónica.',
      'melodic-minor':
        'Los ejemplos usan la forma ascendente de la menor melódica. En la, la tercera es menor, mientras que la sexta (F♯) y la séptima (G♯) son mayores.',
      'harmonic-major':
        'Baja el sexto grado de do mayor de A a A♭. La distancia entre A♭ y B es de tres trastes en una cuerda.',
      'double-harmonic':
        'La escala mayor doble armónica de do tiene dos pasos de tres semitonos, de D♭ a E y de A♭ a B. Cada modo empieza en un grado distinto de esa secuencia.',
      pentatonic:
        'Compara los cinco grados de las pentatónicas mayor y menor. La forma menor omite el segundo y el sexto grados de la escala menor natural.',
      blues:
        'El blues menor de la añade E♭ entre D y E a la pentatónica menor. Toca esas tres notas despacio para oír la nota de paso.',
      symmetric:
        'La escala de tonos enteros avanza de tono en tono. Las dos disminuidas alternan tonos y semitonos, pero empiezan con intervalos distintos.',
      bebop:
        'Estas escalas de bebop tienen ocho notas. En el bebop dominante de do, B queda entre B♭ y el regreso a la tónica C.',
      arpeggio:
        'En un arpegio las notas de un acorde suenan una por una. Compara Cmaj7 y C7. Solo cambia la séptima.',
    },
  },
};

// These familiar A examples complement the C examples used throughout the catalog.
const inA = new Set([
  'dorian',
  'natural-minor',
  'harmonic-minor',
  'melodic-minor',
  'minor-pentatonic',
  'minor-blues',
  'minor-triad',
  'minor-7',
  'minor-major-7',
]);

function referenceFamilies(lang) {
  return Object.entries(FAMILIES).map(([id, name]) => ({
    id,
    name: name[lang],
    description: referenceCopy[lang].descriptions[id],
    scales: SCALES.filter((scale) => scale.family === id).map((scale) => {
      const tonic = inA.has(scale.id) ? 'A' : 'C';
      return {
        id: scale.id,
        name: scale.name[lang],
        tonic,
        formula: scale.formula.map(prettyDegree).join(' '),
        notes: scale.formula.map((degree) => spellDegree(tonic, degree)).join(' '),
      };
    }),
  }));
}

function diagram(lang, { id, tonic }, instrument) {
  const bass = instrument === 'bass';
  const params = new URLSearchParams({
    lang,
    instrument,
    strings: bass ? '4' : '6',
    tuning: bass ? 'bass-4-standard' : 'guitar-standard',
    scale: id,
    root: tonic === 'A' ? '9' : '0',
    labels: 'notes',
    allNotes: 'false',
    range: 'full',
    neck: 'octave',
  });
  return routes[lang].home + '?' + params;
}

export function referencePage(lang, head, base, revision) {
  const r = referenceCopy[lang];
  const t = copy[lang];
  const families = referenceFamilies(lang);
  const href = (path) => escape(base + path.slice(1));
  const familyLinks = families
    .map(({ id, name }) => `<li><a href="#family-${id}">${escape(name)}</a></li>`)
    .join('');
  const sections = families
    .map((family) => {
      const rows = family.scales
        .map((scale) => {
          const diagramLinks = ['guitar', 'bass']
            .map(
              (instrument) =>
                `<a href="${href(diagram(lang, scale, instrument))}" aria-label="${escape([t[instrument], scale.name, scale.tonic].join(' · '))}">${escape(t[instrument])}</a>`,
            )
            .join('');
          return `<li class="reference-row" id="scale-${scale.id}">
      <h3>${escape(scale.name)}</h3>
      <dl><div><dt>${escape(r.formula)}</dt><dd>${escape(scale.formula)}</dd></div>
      <div><dt>${escape(r.example)} ${scale.tonic}</dt><dd>${escape(scale.notes)}</dd></div></dl>
      <div class="reference-play">${diagramLinks}</div></li>`;
        })
        .join('\n');
      return `<section class="reference-family" aria-labelledby="family-${family.id}">
      <h2 id="family-${family.id}" tabindex="-1">${escape(family.name)}</h2><p>${escape(family.description)}</p>
      <ul class="reference-scales">${rows}</ul>
      <a class="reference-return" href="#families">${escape(r.familyLink)}</a>
    </section>`;
    })
    .join('\n');
  const content = `<article class="scale-reference">
    <header class="practice-intro"><h1>${escape(r.title)}</h1><p>${escape(r.intro)}</p><p>${escape(r.directions)}</p>
    <a href="${href(routes[lang].guide)}">${escape(r.practice)}</a></header>
    <nav aria-labelledby="families"><h2 id="families" tabindex="-1">${escape(r.families)}</h2>
    <ul class="reference-index">${familyLinks}</ul></nav>
    ${sections}
    </article>`;
  return readingPage(lang, 'reference', head, base, revision, content);
}

export function referenceMarkdown(lang) {
  const r = referenceCopy[lang];
  const t = copy[lang];
  const url = (path) => new URL(path, siteOrigin).href;
  const sections = [
    `# ${r.title}`,
    r.intro,
    r.directions,
    `[${r.practice}](${url(routes[lang].guide)})`,
  ];
  for (const family of referenceFamilies(lang)) {
    sections.push(`## ${family.name}`, family.description);
    for (const scale of family.scales) {
      const links = ['guitar', 'bass'].map(
        (instrument) => `[${t[instrument]}](${url(diagram(lang, scale, instrument))})`,
      );
      sections.push(
        `### ${scale.name}\n\n${r.formula} · ${scale.formula}\n\n${r.example} ${scale.tonic} · ${scale.notes}\n\n${links.join(' · ')}`,
      );
    }
  }
  sections.push(
    `[Tukany](${url(routes[lang].reference)}) · Lucas Marques · [CC BY 4.0](${license})`,
  );
  return sections.join('\n\n') + '\n';
}
