import { prettyDegree } from './music.mjs';
import { normalizeLanguage } from './locales.mjs';

// Name the written interval, so ♭♭7 stays a diminished seventh rather than a sixth.
const intervalNames = {
  1: { en: 'unison', pt: 'uníssono', es: 'unísono' },
  b2: { en: 'minor second', pt: 'segunda menor', es: 'segunda menor' },
  2: { en: 'major second', pt: 'segunda maior', es: 'segunda mayor' },
  '#2': { en: 'augmented second', pt: 'segunda aumentada', es: 'segunda aumentada' },
  bb3: { en: 'diminished third', pt: 'terça diminuta', es: 'tercera disminuida' },
  b3: { en: 'minor third', pt: 'terça menor', es: 'tercera menor' },
  3: { en: 'major third', pt: 'terça maior', es: 'tercera mayor' },
  b4: { en: 'diminished fourth', pt: 'quarta diminuta', es: 'cuarta disminuida' },
  4: { en: 'perfect fourth', pt: 'quarta justa', es: 'cuarta justa' },
  '#4': { en: 'augmented fourth', pt: 'quarta aumentada', es: 'cuarta aumentada' },
  b5: { en: 'diminished fifth', pt: 'quinta diminuta', es: 'quinta disminuida' },
  5: { en: 'perfect fifth', pt: 'quinta justa', es: 'quinta justa' },
  '#5': { en: 'augmented fifth', pt: 'quinta aumentada', es: 'quinta aumentada' },
  b6: { en: 'minor sixth', pt: 'sexta menor', es: 'sexta menor' },
  6: { en: 'major sixth', pt: 'sexta maior', es: 'sexta mayor' },
  '#6': { en: 'augmented sixth', pt: 'sexta aumentada', es: 'sexta aumentada' },
  bb7: { en: 'diminished seventh', pt: 'sétima diminuta', es: 'séptima disminuida' },
  b7: { en: 'minor seventh', pt: 'sétima menor', es: 'séptima menor' },
  7: { en: 'major seventh', pt: 'sétima maior', es: 'séptima mayor' },
};
export function intervalName(degree, lang = 'en') {
  const language = normalizeLanguage(lang);
  const normalized = String(degree).replaceAll('♭', 'b').replaceAll('♯', '#');
  return (
    intervalNames[normalized]?.[language] ??
    `${{ en: 'degree', pt: 'grau', es: 'grado' }[language]} ${prettyDegree(normalized)}`
  );
}
