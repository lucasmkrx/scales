// SPDX-License-Identifier: MPL-2.0

import { test, expect } from '@playwright/test';

const url = (changes = {}) =>
  `/?${new URLSearchParams({
    instrument: 'guitar',
    strings: '6',
    tuning: 'guitar-standard',
    root: '0',
    scale: 'major',
    frets: '21',
    hand: 'right',
    lang: 'en',
    labels: 'notes',
    range: 'caged-major-1',
    ...changes,
  })}`;
const errors = new WeakMap();

test.beforeEach(({ page }) => {
  const messages = [];
  page.on('pageerror', (error) => messages.push(error.message));
  errors.set(page, messages);
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('the coffee button follows all six languages and fits with the header controls', async ({
  page,
}) => {
  await page.goto(url());
  const language = page.locator('#language-trigger');
  const coffee = page.locator('.coffee-link');
  await expect(page.locator('#theme-toggle')).toHaveCSS('border-radius', '9px');
  await expect(language).toHaveCSS('border-radius', '9px');
  await expect(coffee).toHaveCSS('border-radius', '9px');
  const coffeePage = 'https://buymeacoffee.com/lucasmkrx?l=';
  await expect(coffee).toHaveAttribute('href', `${coffeePage}en`);
  for (const [option, label, destination] of [
    ['Español', 'Invítame a un café', 'es'],
    ['Português', 'Me pague um café', 'en'],
    ['Italiano', 'Offrimi un caffè', 'it'],
    ['Français', 'Offrez-moi un café', 'fr'],
    ['English', 'Buy me a coffee', 'en'],
    ['Deutsch', 'Kaffee spendieren', 'de'],
  ]) {
    await language.click();
    await page.getByRole('option', { name: option, exact: true }).click();
    await expect(coffee).toHaveText(label);
    await expect(coffee).toHaveAccessibleName(label);
    await expect(coffee).toHaveAttribute('href', `${coffeePage}${destination}`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 401, 441, 560, 667, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const controls = await page
        .locator('#theme-toggle, #language-trigger, .coffee-link')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const { left, right, height, top } = element.getBoundingClientRect();
            return { left, right, height, top };
          }),
        );
      const [theme, selector, button] = controls;
      expect(theme.left).toBeGreaterThanOrEqual(0);
      expect(theme.right).toBeLessThan(selector.left);
      expect(selector.right).toBeLessThan(button.left);
      expect(button.right).toBeLessThanOrEqual(width);
      const brand = await page.locator('.masthead .brand').boundingBox();
      if (width <= 720) {
        expect(brand.x + brand.width).toBeLessThan(theme.left);
        await expect(coffee.locator('span')).toBeHidden();
      } else {
        const labelBounds = await coffee.locator('span').boundingBox();
        expect(labelBounds.x + labelBounds.width).toBeLessThan(button.right);
      }
      for (const control of controls) {
        expect(control.top).toBeCloseTo(theme.top, 0);
        expect(control.height).toBeCloseTo(44, 0);
      }
    }
  }
  await page.reload();
  await expect(coffee).toHaveAttribute('href', `${coffeePage}de`);
});

test('footer links fit at phone width and the top link returns to the header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 675 });
  await page.goto(url({ lang: 'de' }));
  const footer = page.locator('.site-footer');
  const source = footer.getByRole('link', { name: 'Quellcode und Mitarbeit' });
  const credits = footer.getByRole('link', { name: 'Bildnachweise für Symbole' });
  const top = footer.getByRole('link', { name: 'Nach oben' });
  await expect(source).toHaveAttribute('href', 'https://github.com/lucasmkrx/tukany');
  await expect(credits).toHaveAttribute('href', /THIRD-PARTY-NOTICES\.md/);
  for (const link of [source, credits, top]) {
    const bounds = await link.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  expect((await source.boundingBox()).y).toBeLessThan((await credits.boundingBox()).y);
  await top.click();
  await expect(page).toHaveURL(/#top$/);
  await expect(page.locator('.site-header')).toBeInViewport({ ratio: 1 });
});

test('dropdown corners stay capped and the selectors retain their rounded shapes', async ({
  page,
}) => {
  await page.goto(url());
  await page.locator('#instrument-toggle').click();
  await expectCircularCounts(page);
  await expectSwitchLabelsCentered(page);
  const trigger = page.locator('#tuning');
  const popup = page.locator('.choice-popup');
  const list = popup.getByRole('listbox');
  const options = list.getByRole('option');
  await trigger.press('Enter');
  await expect(list).toBeVisible();
  await expect(trigger).toHaveCSS('border-radius', '14px');
  await expect(popup).toHaveCSS('border-radius', '20px');
  const selected = list.getByRole('option', { selected: true });
  await expect(selected.locator('small')).toBeVisible();
  await expect(selected).toHaveCSS('border-radius', '12px');
  const optionAlignment = await selected.evaluate((option) => {
    const title = option.querySelector('span').getBoundingClientRect();
    const detail = option.querySelector('small').getBoundingClientRect();
    const check = option.querySelector('.choice-check').getBoundingClientRect();
    const row = option.getBoundingClientRect();
    const textCenter = (title.top + detail.bottom) / 2;
    return {
      sharedIndent: title.left - detail.left,
      textOffset: textCenter - (row.top + row.height / 2),
      checkOffset: check.top + check.height / 2 - textCenter,
    };
  });
  expect(optionAlignment.sharedIndent).toBeCloseTo(0, 0);
  expect(optionAlignment.textOffset).toBeCloseTo(0, 0);
  expect(optionAlignment.checkOffset).toBeCloseTo(0, 0);
  for (const key of ['Home', 'End']) {
    await page.keyboard.press(key);
    await expect(key === 'Home' ? options.first() : options.last()).toBeFocused();
    expect(await list.evaluate((element) => element.scrollTop > 0)).toBe(key === 'End');
    const hitAreas = await popup.evaluate((frame) => {
      const box = frame.getBoundingClientRect();
      const pageBehind = (x, y) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && !frame.contains(hit));
      };
      const center = document.elementFromPoint(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      return {
        cornersExposePage:
          pageBehind(box.left + 3, box.top + 3) &&
          pageBehind(box.right - 3, box.top + 3) &&
          pageBehind(box.left + 3, box.bottom - 3) &&
          pageBehind(box.right - 3, box.bottom - 3),
        centerHitsOption: Boolean(center?.closest('[role="option"]')),
      };
    });
    expect(hitAreas).toEqual({ cornersExposePage: true, centerHitsOption: true });
  }
  const faces = page.locator(
    '.workspace .select-trigger:not(#scale-family-trigger):visible, .root-notes label > span:visible, .number-keys label > span:visible, .segmented label > span:visible, .switch-option:visible',
  );
  const undersizedCorners = await faces.evaluateAll((elements) =>
    elements.flatMap((element) => {
      const box = element.getBoundingClientRect();
      const diameter = Math.min(box.width, box.height);
      const style = getComputedStyle(element);
      const corners = [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomLeftRadius,
        style.borderBottomRightRadius,
      ];
      const rounded = corners.every((radius) => {
        const value = parseFloat(radius);
        return radius.endsWith('%') ? value >= 50 : value >= diameter / 2 - 0.5;
      });
      return rounded ? [] : [element.id || element.className || element.textContent];
    }),
  );
  expect(undersizedCorners).toEqual([]);
  await page.keyboard.press('ArrowUp');
  const choice = await list.locator(':focus').getAttribute('value');
  await page.keyboard.press('Enter');
  await expect(popup).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(new URL(page.url()).searchParams.get('tuning')).toBe(
    choice.replace(/^guitar-/, ''),
  );
});

async function expectCircularCounts(page) {
  const counts = page.locator('.number-keys label > span');
  await expect(counts.first()).toBeVisible();
  for (const face of await counts.all()) {
    const { width, height } = await face.boundingBox();
    expect(width).toBeCloseTo(44, 2);
    expect(height).toBeCloseTo(width, 2);
    await expect(face).toHaveCSS('border-radius', '50%');
  }
}

async function expectSwitchLabelsCentered(page) {
  const offsets = await page.locator('.switch-control label').evaluateAll((labels) =>
    labels.map((label) => {
      const face = label.getBoundingClientRect();
      const text = label
        .querySelector('.switch-option [data-i18n]')
        .getBoundingClientRect();
      return text.top + text.height / 2 - (face.top + face.height / 2);
    }),
  );
  for (const offset of offsets) expect(offset).toBeCloseTo(0, 0);
}

test('settings open the same listbox and apply localized keyboard and pointer choices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url({ root: '6' }));
  await page.locator('#instrument-toggle').click();
  await expectCircularCounts(page);
  const list = page.getByRole('listbox');
  for (const [id, label] of [
    ['tuning', 'Tuning'],
    ['language', 'Language'],
    ['scale-family', 'Scale family'],
  ]) {
    const trigger = page.locator(id === 'tuning' ? '#tuning' : `#${id}-trigger`);
    await trigger.click();
    await expect(list).toHaveAttribute('id', 'choice-list');
    await expect(list).toHaveAccessibleName(label);
    await expect(list.locator('[aria-selected="true"]')).toBeFocused();
    const bounds = await list.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  const language = page.locator('#language-trigger');
  async function expectFlag(control, country) {
    const image = control.locator('img[alt=""]');
    await expect(image).toHaveAttribute(
      'src',
      new RegExp(`/flags/${country}\\.svg(?:\\?|$)`),
    );
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await expectFlag(language, 'us');
  await language.click();
  for (const [label, country] of [
    ['English', 'us'],
    ['Português', 'br'],
    ['Español', 'es'],
    ['Italiano', 'it'],
    ['Français', 'fr'],
    ['Deutsch', 'de'],
  ]) {
    await expectFlag(list.getByRole('option', { name: label, exact: true }), country);
  }
  await list.getByRole('option', { name: 'Português', exact: true }).click();
  await expectFlag(language, 'br');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  const roots = page.getByRole('group', { name: 'Tônica', exact: true });
  await expect(roots.getByRole('radio')).toHaveCount(12);
  await expect(roots.getByText('Círculo das quintas', { exact: true })).toHaveCount(0);
  await roots.getByRole('radio', { name: 'C', exact: true }).press('ArrowRight');
  const nextRoot = roots.getByRole('radio', { name: 'G', exact: true });
  await expect(nextRoot).toBeChecked();
  await expect(nextRoot).toBeFocused();
  await expect(page.locator('[data-export="catalog"]')).toContainText(
    'Catálogo completo',
  );
  await language.press('ArrowDown');
  await page.keyboard.press('e');
  await expect(list.getByRole('option', { name: 'Español', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(language).toBeFocused();
  await expectFlag(language, 'es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
  for (const [name, code, tag, catalog, download] of [
    ['Italiano', 'it', 'it-IT', 'Catalogo completo', 'Scarica PDF'],
    ['Français', 'fr', 'fr-FR', 'Catalogue complet', 'Télécharger le PDF'],
    ['Deutsch', 'de', 'de-DE', 'Gesamter Katalog', 'PDF herunterladen'],
  ]) {
    await language.click();
    await list.getByRole('option', { name, exact: true }).click();
    await expectFlag(language, code);
    await expect(language).toContainText(name);
    await expect(page.locator('html')).toHaveAttribute('lang', tag);
    expect(new URL(page.url()).searchParams.get('lang')).toBe(code);
    const exportButton = page.locator('[data-export="catalog"]');
    await expect(exportButton).toBeEnabled();
    await expect(exportButton).toContainText(catalog);
    await expect(exportButton).toContainText(download);
  }
});

test('a fresh visit starts in light mode before the app loads, even on a dark device', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  let release;
  const applicationGate = new Promise((resolve) => (release = resolve));
  await page.route('**/src/app.mjs*', async (route) => {
    await applicationGate;
    await route.continue();
  });
  try {
    await page.goto(url(), { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#board .fretboard-map')).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator('#board .fretboard-map')).toBeVisible();
  const toggle = page.locator('#theme-toggle');
  const sun = toggle.locator('.fa-sun');
  const moon = toggle.locator('.fa-moon');
  await expect(toggle).toHaveRole('switch');
  await expect(toggle).not.toBeChecked();
  await expect(sun).toBeHidden();
  await expect(moon).toBeVisible();
  await expect(toggle).toHaveAccessibleName('Theme: Light. Switch to Dark.');
  expect(
    await page.evaluate(async () => {
      const faces = await document.fonts.load('900 16px "Font Awesome 6 Free"');
      return faces.length > 0 && faces.every((face) => face.status === 'loaded');
    }),
  ).toBe(true);

  const logos = page.locator('header .brand, footer .brand');
  await expect(logos).toHaveCount(2);
  const desktopViewport = page.viewportSize();
  const checkLogos = async () => {
    const sizes = [];
    for (const viewport of [{ width: 390, height: 844 }, desktopViewport]) {
      await page.setViewportSize(viewport);
      const measurements = await logos.evaluateAll((brands) =>
        brands.map((brand) => {
          const link = brand.getBoundingClientRect();
          const icon = brand.querySelector('.brand-icon').getBoundingClientRect();
          const wordmark = brand.querySelector('.brand-wordmark').getBoundingClientRect();
          // The capital T ends at 73% of the SVG height; the y descends below it.
          const baseline = wordmark.top + wordmark.height * 0.73;
          return {
            iconHeight: icon.height,
            iconWidth: icon.width,
            wordmarkHeight: wordmark.height,
            wordmarkWidth: wordmark.width,
            baselineError: Math.abs(icon.bottom - baseline),
            insideLink: [icon, wordmark].every(
              (part) =>
                part.top >= link.top &&
                part.bottom <= link.bottom &&
                part.left >= link.left &&
                part.right <= link.right,
            ),
          };
        }),
      );
      for (const logo of measurements) {
        expect(logo.wordmarkHeight).toBeGreaterThan(0);
        expect(logo.iconHeight).toBeCloseTo(logo.wordmarkHeight, 0);
        expect(logo.baselineError).toBeLessThanOrEqual(1);
        expect(logo.insideLink).toBe(true);
        sizes.push([
          logo.iconHeight,
          logo.iconWidth,
          logo.wordmarkHeight,
          logo.wordmarkWidth,
        ]);
      }
    }
    return sizes;
  };
  const lightLogoSizes = await checkLogos();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await checkLogos()).toEqual(lightLogoSizes);
  await expect(toggle).toBeChecked();
  await expect(sun).toBeVisible();
  await expect(moon).toBeHidden();
  await expect(toggle).toHaveAccessibleName('Theme: Dark. Switch to Light.');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toBeChecked();
  expect(new URL(page.url()).searchParams.has('theme')).toBe(false);
});

test('keyboard theme changes persist without replacing the selected fretboard', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
  await expect(page.locator('#fretboard-heading')).toHaveCSS(
    'font-family',
    /^"?IBM Plex Sans"?,/,
  );
  await expect(page.locator('#scale-family-trigger')).toHaveCSS(
    'font-family',
    /^"?IBM Plex Sans"?,/,
  );
  await expect(page.locator('#root-notes label > span').first()).toHaveCSS(
    'font-family',
    /^"?IBM Plex Mono"?,/,
  );
  const loadedFonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [
      ...new Set(
        [...document.fonts]
          .filter((font) => font.status === 'loaded' && font.family.includes('IBM Plex'))
          .map((font) => font.family.replaceAll('"', '')),
      ),
    ].sort();
  });
  expect(loadedFonts).toEqual(['IBM Plex Mono', 'IBM Plex Sans']);
  const noteColors = () =>
    page.locator('#board .note:not(.muted)').evaluateAll((notes) =>
      notes.map((note) => {
        const pitch = Number(note.dataset.midi) % 12;
        const dot = document.querySelector(
          `#formula-degrees [data-pitch="${pitch}"] .color-dot`,
        );
        return {
          fill: getComputedStyle(note).backgroundColor,
          dot: getComputedStyle(dot).backgroundColor,
        };
      }),
    );
  const lightColors = await noteColors();
  await page.evaluate(() => {
    window.appearanceBoard = document.querySelector('#board .fretboard-map');
    window.appearancePattern = document.querySelector('[data-pattern="caged-major-1"]');
  });
  const toggle = page.locator('#theme-toggle');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme-toggle')).toBeChecked();
  await expect(toggle).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        window.appearanceBoard === document.querySelector('#board .fretboard-map') &&
        window.appearancePattern ===
          document.querySelector('[data-pattern="caged-major-1"]'),
    ),
  ).toBe(true);
  const darkColors = await noteColors();
  expect(new Set(darkColors.map(({ fill }) => fill)).size).toBe(7);
  for (const [index, { fill, dot }] of darkColors.entries()) {
    expect(fill).not.toBe(lightColors[index].fill);
    expect(fill).toBe(dot);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await noteColors()).toEqual(darkColors);
  await expect(page.locator('[data-pattern="caged-major-1"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await toggle.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-image', 'none');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#ffffff',
  );
  await expect(page.locator('#fretboard-heading')).toHaveCSS(
    'font-family',
    /^"?IBM Plex Sans"?,/,
  );
  expect(await noteColors()).toEqual(lightColors);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Theme: Light. Switch to Dark.');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-toggle')).not.toBeChecked();
});

test('an explicit theme survives music and language changes with localized control names', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  const toggle = page.locator('#theme-toggle');
  await toggle.click();
  for (const [lang, label] of [
    ['en', 'Theme: Dark. Switch to Light.'],
    ['pt', 'Tema: Escuro. Mudar para Claro.'],
    ['es', 'Tema: Oscuro. Cambiar a Claro.'],
    ['it', 'Tema scuro. Passa al tema chiaro.'],
    ['fr', 'Thème actuel : sombre. Passer au thème clair.'],
    ['de', 'Darstellung: Dunkel. Zu „Hell“ wechseln.'],
  ]) {
    await page.locator('#language').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAccessibleName(label);
    await expect(toggle).toHaveAttribute('title', label);
  }
  await page.getByRole('radio', { name: 'A', exact: true }).check();
  await page.locator('#instrument-toggle').click();
  await page
    .locator('#instrument label')
    .filter({ has: page.locator('[value="bass"]') })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'A', exact: true })).toBeChecked();
});

test('blocked storage starts in light mode and allows an in-memory toggle', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(url());
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
});

test('legacy and invalid saved preferences fall back to light on a dark device', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(url());
  for (const saved of ['system', 'invalid']) {
    await page.evaluate((value) => localStorage.setItem('scales.theme', value), saved);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('#theme-toggle')).not.toBeChecked();
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-toggle')).toBeChecked();
  }
});

test('a second explorer tab receives theme changes and clearing the preference restores light', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(url());
  const secondTab = await context.newPage();
  await secondTab.emulateMedia({ colorScheme: 'dark' });
  await secondTab.goto('/');
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.locator('#theme-toggle').click();
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'dark');
  await secondTab.reload();
  await expect(secondTab.locator('html')).toHaveAttribute('data-theme', 'dark');
  await secondTab.evaluate(() => localStorage.removeItem('scales.theme'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-toggle')).not.toBeChecked();
});

test('dark appearance keeps controls contained and preserves mirrored pattern geometry', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('scales.theme', 'dark'));
  for (const state of [
    { width: 320, lang: 'en', hand: 'right' },
    { width: 390, lang: 'pt', hand: 'left' },
    { width: 1360, lang: 'es', hand: 'left' },
    { width: 320, lang: 'de', hand: 'right' },
    { width: 390, lang: 'fr', hand: 'left' },
    { width: 390, lang: 'it', hand: 'right' },
  ]) {
    await page.setViewportSize({ width: state.width, height: 900 });
    await page.goto(url({ lang: state.lang, hand: state.hand }));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#323e3a',
    );
    await expect(page.locator('body')).toHaveCSS('background-image', 'none');
    await expect(page.locator('#fretboard-heading')).toHaveCSS(
      'font-family',
      /^"?IBM Plex Sans"?,/,
    );
    await page.locator('#instrument-toggle').click();
    await expectSwitchLabelsCentered(page);
    await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
    // Colors can change while type metrics and component geometry stay identical.
    const dimensions = () =>
      page
        .locator(
          'main, .panel, .board-scroll, .fretboard-map, .export-card, .site-footer',
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const { x, width, height } = element.getBoundingClientRect();
            return [
              Math.round(x),
              Math.round(width),
              Math.round(height),
              getComputedStyle(element).font,
            ];
          }),
        );
    await page.evaluate(() => document.fonts.ready);
    const dark = await dimensions();
    await page.locator('#theme-toggle').click();
    expect(await dimensions()).toEqual(dark);
    await page.locator('#theme-toggle').click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const toggle = await page.locator('#theme-toggle').boundingBox();
    expect(toggle.width).toBeCloseTo(44, 3);
    expect(toggle.height).toBeCloseTo(44, 3);
    expect(toggle.x).toBeGreaterThanOrEqual(0);
    expect(toggle.x + toggle.width).toBeLessThanOrEqual(state.width);
    const surfaces = await page.evaluate(() => [
      getComputedStyle(document.body).backgroundColor,
      getComputedStyle(document.querySelector('#board .fret')).backgroundColor,
    ]);
    for (const color of surfaces) {
      const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
      expect(Math.max(...channels)).toBeLessThan(160);
    }
  }
});

test('reduced motion disables control and fretboard animations during interaction', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(url());
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Exercise strike styling without depending on an audio output device in CI.
  // Audio synthesis has separate coverage.
  await page
    .locator('#board .note')
    .first()
    .evaluate((note) => note.classList.add('sounding'));
  const styles = await page.evaluate(() => {
    const targets = [
      document.querySelector('#theme-toggle'),
      document.querySelector('#board .fretboard-map'),
      document.querySelector('.note.sounding'),
      document.querySelector('.scale-choice[aria-pressed="true"]'),
    ].map((element) => getComputedStyle(element));
    targets.push(getComputedStyle(document.querySelector('.note.sounding'), '::after'));
    return targets.map((style) => ({
      animation: style.animationName,
      transitions: style.transitionDuration.split(',').map((value) => parseFloat(value)),
    }));
  });
  for (const style of styles) {
    expect(style.animation).toBe('none');
    expect(style.transitions.every((duration) => duration === 0)).toBe(true);
  }
});

test('scale names, formulas, and selection marks fit on desktop and phones', async ({
  page,
}) => {
  const sizes = (buttons) =>
    buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return {
          label: element.textContent.trim(),
          x,
          y,
          width,
          height,
          fits:
            element.scrollWidth <= element.clientWidth + 1 &&
            element.scrollHeight <= element.clientHeight + 1,
        };
      }),
    );
  for (const [width, lang, columns] of [
    [1360, 'en', 2],
    [320, 'es', 1],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url({ lang, scale: 'chromatic' }));
    const roots = page.locator('#root-notes label > span');
    await expect(roots).toHaveCount(12);
    await page.evaluate(() => document.fonts.ready);
    const wheel = await page.locator('#root-wheel').boundingBox();
    const rootSizes = await sizes(roots);
    for (const [index, root] of rootSizes.entries()) {
      expect(root.width, root.label).toBeCloseTo(root.height, 0);
      expect(root.height, root.label).toBeGreaterThanOrEqual(44);
      expect(root.fits, root.label).toBe(true);
      expect(root.x).toBeGreaterThanOrEqual(wheel.x);
      expect(root.x + root.width).toBeLessThanOrEqual(wheel.x + wheel.width);
      expect(root.y).toBeGreaterThanOrEqual(wheel.y);
      expect(root.y + root.height).toBeLessThanOrEqual(wheel.y + wheel.height);
      const next = rootSizes[(index + 1) % rootSizes.length];
      expect(Math.hypot(root.x - next.x, root.y - next.y)).toBeGreaterThan(root.width);
    }
    const results = page.locator('#scale-results');
    const rows = results.locator('[data-scale]');
    const selected = results.locator('[data-scale][aria-pressed="true"]');
    await expect(results).toHaveCSS('border-top-width', '0px');
    await expect(rows.first()).toHaveCSS('text-align', /^(start|left)$/);
    await expect(selected).toHaveAccessibleName(
      lang === 'en' ? 'Chromatic' : 'Cromática',
    );
    const choices = await sizes(rows);
    expect(choices.length).toBeGreaterThan(1);
    expect(new Set(choices.map((choice) => choice.x)).size).toBe(columns);
    await expect(results.getByRole('button')).toHaveCount(choices.length);
    await expect(selected.locator('.scale-choice-check')).toBeVisible();
    await expect(results.locator('.scale-choice-formula:visible')).toHaveCount(
      choices.length,
    );
    for (const choice of choices) {
      expect(choice.height, choice.label).toBeGreaterThanOrEqual(44);
      expect(choice.width, choice.label).toBeGreaterThanOrEqual(44);
      expect(choice.fits, choice.label).toBe(true);
    }
    const tones = page.locator('#fretboard .scale-header #formula-degrees button');
    await expect(tones).toHaveCount(12);
    const toneSizes = await sizes(tones);
    for (const tone of toneSizes) {
      expect(tone.label).not.toContain('/');
      expect(tone.width, tone.label).toBeGreaterThanOrEqual(44);
      expect(tone.height, tone.label).toBeGreaterThanOrEqual(44);
      expect(tone.fits, tone.label).toBe(true);
    }
    if (width === 320) expect(new Set(toneSizes.map((tone) => tone.x)).size).toBe(4);
    const formula = await tones.allTextContents();
    const degrees = await tones.locator('.formula-degree').allTextContents();
    await expect(selected.locator('.scale-choice-formula')).toHaveText(degrees.join(' '));
    await page
      .locator('#labels label')
      .filter({ has: page.locator('[value="degrees"]') })
      .click();
    expect(await tones.allTextContents()).toEqual(formula);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  }
});
