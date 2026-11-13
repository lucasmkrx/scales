// Short keys keep existing shared URLs compatible. Tags identify the regional content.
export const LANGUAGES = Object.freeze({
  en: Object.freeze({ tag: 'en-US', label: 'English' }),
  pt: Object.freeze({ tag: 'pt-BR', label: 'Português' }),
  es: Object.freeze({ tag: 'es-419', label: 'Español' }),
});
export function normalizeLanguage(value) {
  const language = String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return Object.hasOwn(LANGUAGES, language) ? language : 'en';
}
// Tuning IDs and letter notation stay stable across languages and saved setups.
export function tuningName(tuning, lang = 'en') {
  const language = normalizeLanguage(lang);
  const name = tuning.name;
  if (tuning.id === 'custom')
    return { en: 'Custom', pt: 'Personalizada', es: 'Personalizada' }[language];
  if (language === 'en') return name;
  if (name.endsWith(' standard'))
    return name.replace(' standard', language === 'pt' ? ' padrão' : ' estándar');
  if (name.includes(' standard / '))
    return name.replace(
      ' standard / ',
      language === 'pt' ? ' padrão / ' : ' estándar / ',
    );
  if (name.startsWith('High C')) return name.replace('High C', 'C agudo');
  if (name.startsWith('Open '))
    return `${name.slice(5)} ${language === 'pt' ? 'aberta' : 'abierta'}`;
  if (name.startsWith('Double drop '))
    return `Drop ${name.slice(12)} ${language === 'pt' ? 'duplo' : 'doble'}`;
  return name;
}
