import { escape } from '../src/board.mjs';
import { TUNINGS } from '../src/catalog.mjs';
import { GUIDED_BOOKS } from '../src/guides.mjs';
import { copy } from '../src/i18n.mjs';
import { LANGUAGES, tuningName } from '../src/locales.mjs';
import { routes, siteOrigin } from '../src/site.mjs';
import { license, source, readingPage } from './reading-page.mjs';
import { practiceContent } from './practice-content.mjs';

function exercisePath(lang, { instrument, strings, tuning, root, scale }) {
  const params = new URLSearchParams({
    instrument,
    strings,
    tuning,
    root,
    scale,
    lang,
    labels: 'notes',
    allNotes: scale === 'dorian' ? 'true' : 'false',
    range: 'full',
    neck: 'octave',
  });
  return routes[lang].home + '?' + params;
}

function books(lang) {
  const t = copy[lang];
  return GUIDED_BOOKS.map((book) => {
    const tuning = TUNINGS.find(({ id }) => id === book.tuning);
    return {
      path: '/guides/' + book.file,
      tag: LANGUAGES[book.lang].tag,
      label:
        [
          t[book.instrument],
          tuningName(tuning, lang),
          t[book.hand],
          LANGUAGES[book.lang].label,
        ].join(' · ') + ' (PDF)',
    };
  });
}

export function guidePage(lang, head, base, revision) {
  const guide = practiceContent[lang];
  const explorer = routes[lang].home + '?lang=' + lang;
  const href = (path) => escape(base + path.slice(1));
  const exercises = guide.exercises
    .map(
      (exercise) => `<section class="practice-exercise">
    <h3>${escape(exercise.title)}</h3>
    <p>${escape(exercise.body)}</p>
    <a class="practice-action" href="${href(exercisePath(lang, exercise))}">${escape(exercise.action)} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
  </section>`,
    )
    .join('\n');
  const questions = guide.questions
    .map(
      ({ question, answer }) =>
        `<div class="practice-answer"><h3>${escape(question)}</h3><p>${escape(answer)}</p></div>`,
    )
    .join('\n');
  const downloads = books(lang)
    .map(
      (book) =>
        `<li><a href="${href(book.path)}" hreflang="${book.tag}" type="application/pdf">${escape(book.label)}</a></li>`,
    )
    .join('\n');

  const content = `
<article>
    <header class="practice-intro">
      <h1>${escape(guide.title)}</h1>
      <p class="practice-byline">${escape(guide.byline)}</p>
      <p>${escape(guide.intro)}</p>
    </header>
    <section aria-labelledby="exercises"><h2 id="exercises">${escape(guide.exerciseHeading)}</h2>
      ${exercises}
      <a href="${href(routes[lang].reference)}">${escape(guide.referenceLink)}</a>
    </section>
    <section aria-labelledby="questions"><h2 id="questions">${escape(guide.questionHeading)}</h2>
      ${questions}
    </section>
    <section aria-labelledby="downloads"><h2 id="downloads">${escape(guide.downloadsHeading)}</h2>
      <ul class="practice-books">${downloads}</ul>
    </section>
  </article>
  <a class="practice-action" href="${href(explorer)}">${escape(guide.backToExplorer)} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
  return readingPage(lang, 'guide', head, base, revision, content);
}

export function guideMarkdown(lang) {
  const guide = practiceContent[lang];
  const absolute = (path) => new URL(path, siteOrigin).href;
  const sections = [
    `# ${guide.title}`,
    guide.byline,
    guide.intro,
    `## ${guide.exerciseHeading}`,
    ...guide.exercises.map(
      (exercise) =>
        `### ${exercise.title}\n\n${exercise.body}\n\n[${exercise.action}](${absolute(exercisePath(lang, exercise))})`,
    ),
    `[${guide.referenceLink}](${absolute(routes[lang].reference)})`,
    `## ${guide.questionHeading}`,
    ...guide.questions.map(({ question, answer }) => `### ${question}\n\n${answer}`),
    `## ${guide.downloadsHeading}`,
    books(lang)
      .map((book) => `- [${book.label}](${absolute(book.path)})`)
      .join('\n'),
    `[${guide.backToExplorer}](${absolute(routes[lang].home + '?lang=' + lang)})`,
    Object.entries(LANGUAGES)
      .map(([key, { label }]) => `[${label}](${absolute(routes[key].guide)})`)
      .join(' · '),
    `[CC BY 4.0](${license}) · [${copy[lang].source}](${source})`,
  ];
  return sections.join('\n\n') + '\n';
}
