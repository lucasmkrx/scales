import { prettyDegree } from './music.mjs';
import { normalizeLanguage } from './locales.mjs';

// Name the written interval, so ♭♭7 stays a diminished seventh rather than a sixth.
const intervalNames = {
  1: {
    en: 'unison',
    pt: 'uníssono',
    es: 'unísono',
    it: 'unisono',
    fr: 'unisson',
    de: 'Prime',
  },
  b2: {
    en: 'minor second',
    pt: 'segunda menor',
    es: 'segunda menor',
    it: 'seconda minore',
    fr: 'seconde mineure',
    de: 'kleine Sekunde',
  },
  2: {
    en: 'major second',
    pt: 'segunda maior',
    es: 'segunda mayor',
    it: 'seconda maggiore',
    fr: 'seconde majeure',
    de: 'große Sekunde',
  },
  '#2': {
    en: 'augmented second',
    pt: 'segunda aumentada',
    es: 'segunda aumentada',
    it: 'seconda aumentata',
    fr: 'seconde augmentée',
    de: 'übermäßige Sekunde',
  },
  bb3: {
    en: 'diminished third',
    pt: 'terça diminuta',
    es: 'tercera disminuida',
    it: 'terza diminuita',
    fr: 'tierce diminuée',
    de: 'verminderte Terz',
  },
  b3: {
    en: 'minor third',
    pt: 'terça menor',
    es: 'tercera menor',
    it: 'terza minore',
    fr: 'tierce mineure',
    de: 'kleine Terz',
  },
  3: {
    en: 'major third',
    pt: 'terça maior',
    es: 'tercera mayor',
    it: 'terza maggiore',
    fr: 'tierce majeure',
    de: 'große Terz',
  },
  b4: {
    en: 'diminished fourth',
    pt: 'quarta diminuta',
    es: 'cuarta disminuida',
    it: 'quarta diminuita',
    fr: 'quarte diminuée',
    de: 'verminderte Quarte',
  },
  4: {
    en: 'perfect fourth',
    pt: 'quarta justa',
    es: 'cuarta justa',
    it: 'quarta giusta',
    fr: 'quarte juste',
    de: 'reine Quarte',
  },
  '#4': {
    en: 'augmented fourth',
    pt: 'quarta aumentada',
    es: 'cuarta aumentada',
    it: 'quarta aumentata',
    fr: 'quarte augmentée',
    de: 'übermäßige Quarte',
  },
  b5: {
    en: 'diminished fifth',
    pt: 'quinta diminuta',
    es: 'quinta disminuida',
    it: 'quinta diminuita',
    fr: 'quinte diminuée',
    de: 'verminderte Quinte',
  },
  5: {
    en: 'perfect fifth',
    pt: 'quinta justa',
    es: 'quinta justa',
    it: 'quinta giusta',
    fr: 'quinte juste',
    de: 'reine Quinte',
  },
  '#5': {
    en: 'augmented fifth',
    pt: 'quinta aumentada',
    es: 'quinta aumentada',
    it: 'quinta aumentata',
    fr: 'quinte augmentée',
    de: 'übermäßige Quinte',
  },
  b6: {
    en: 'minor sixth',
    pt: 'sexta menor',
    es: 'sexta menor',
    it: 'sesta minore',
    fr: 'sixte mineure',
    de: 'kleine Sexte',
  },
  6: {
    en: 'major sixth',
    pt: 'sexta maior',
    es: 'sexta mayor',
    it: 'sesta maggiore',
    fr: 'sixte majeure',
    de: 'große Sexte',
  },
  '#6': {
    en: 'augmented sixth',
    pt: 'sexta aumentada',
    es: 'sexta aumentada',
    it: 'sesta aumentata',
    fr: 'sixte augmentée',
    de: 'übermäßige Sexte',
  },
  bb7: {
    en: 'diminished seventh',
    pt: 'sétima diminuta',
    es: 'séptima disminuida',
    it: 'settima diminuita',
    fr: 'septième diminuée',
    de: 'verminderte Septime',
  },
  b7: {
    en: 'minor seventh',
    pt: 'sétima menor',
    es: 'séptima menor',
    it: 'settima minore',
    fr: 'septième mineure',
    de: 'kleine Septime',
  },
  7: {
    en: 'major seventh',
    pt: 'sétima maior',
    es: 'séptima mayor',
    it: 'settima maggiore',
    fr: 'septième majeure',
    de: 'große Septime',
  },
};
export function intervalName(degree, lang = 'en') {
  const language = normalizeLanguage(lang);
  const normalized = String(degree).replaceAll('♭', 'b').replaceAll('♯', '#');
  return (
    intervalNames[normalized]?.[language] ??
    `${{ en: 'degree', pt: 'grau', es: 'grado', it: 'grado', fr: 'degré', de: 'Stufe' }[language]} ${prettyDegree(normalized)}`
  );
}
