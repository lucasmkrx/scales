// Short keys keep existing shared URLs compatible. Tags identify the regional content.
export const LANGUAGES = Object.freeze({
  en: Object.freeze({ tag: 'en-US', label: 'English' }),
  pt: Object.freeze({ tag: 'pt-BR', label: 'Português' }),
  es: Object.freeze({ tag: 'es-ES', label: 'Español' }),
  it: Object.freeze({ tag: 'it-IT', label: 'Italiano' }),
  fr: Object.freeze({ tag: 'fr-FR', label: 'Français' }),
  de: Object.freeze({ tag: 'de-DE', label: 'Deutsch' }),
});
export function normalizeLanguage(value) {
  const language = String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return Object.hasOwn(LANGUAGES, language) ? language : 'en';
}
const tuningLabels = {
  en: {
    custom: 'Custom',
    standard: '{note} standard',
    highC: 'High C',
    open: 'Open {note}',
    doubleDrop: 'Double drop {note}',
  },
  pt: {
    custom: 'Personalizada',
    standard: '{note} padrão',
    highC: 'C agudo',
    open: '{note} aberta',
    doubleDrop: 'Drop {note} duplo',
  },
  es: {
    custom: 'Personalizada',
    standard: 'Estándar en {note}',
    highC: 'C agudo',
    open: 'Abierta en {note}',
    doubleDrop: 'Doble drop {note}',
  },
  it: {
    custom: 'Personalizzata',
    standard: 'Standard in {note}',
    highC: 'C acuto',
    open: 'Aperta in {note}',
    doubleDrop: 'Double drop {note}',
  },
  fr: {
    custom: 'Personnalisé',
    standard: 'Standard en {note}',
    highC: 'C aigu',
    open: 'Ouvert en {note}',
    doubleDrop: 'Double drop {note}',
  },
  de: {
    custom: 'Eigene',
    standard: '{note}-Standard',
    highC: 'Hohes C',
    open: 'Offene {note}-Stimmung',
    doubleDrop: 'Double Drop {note}',
  },
};

// Tuning IDs and letter notation stay stable across languages and saved setups.
export function tuningName(tuning, lang = 'en') {
  const labels = tuningLabels[normalizeLanguage(lang)];
  if (tuning.id === 'custom') return labels.custom;
  const name = tuning.name;
  const standard = /^([^ ]+) standard(?= \/ |$)/;
  if (standard.test(name))
    return name.replace(standard, (_, note) => labels.standard.replace('{note}', note));
  if (name.startsWith('High C')) return name.replace('High C', labels.highC);
  if (name.startsWith('Open ')) return labels.open.replace('{note}', name.slice(5));
  if (name.startsWith('Double drop '))
    return labels.doubleDrop.replace('{note}', name.slice(12));
  return name;
}
