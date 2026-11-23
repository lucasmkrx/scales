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
    spelling: 'both',
    range: 'caged-major-1',
    neck: 'octave',
    ...changes,
  })}`;
const errors = new WeakMap();

test.beforeEach(({ page }) => {
  const messages = [];
  page.on('pageerror', (error) => messages.push(error.message));
  errors.set(page, messages);
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('dropdown corners stay capped, count buttons are circular, and the other buttons stay pill shaped', async ({
  page,
}) => {
  await page.goto(url());
  await expectCircularCounts(page);
  await page.locator('#edit-formula').click();
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
    'button:not(#tuning, [role="option"]):visible, .root-notes label > span:visible, .number-keys label > span:visible, .segmented label > span:visible, .switch-option:visible',
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
  expect(new URL(page.url()).searchParams.get('tuning')).toBe(choice);
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

test('settings open the same listbox and apply localized keyboard and pointer choices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(url());
  await expectCircularCounts(page);
  const list = page.getByRole('listbox');
  for (const [id, label] of [
    ['language', 'Language'],
    ['scale-family', 'Scale family'],
    ['tuning', 'Tuning'],
    ['spelling', 'Note names'],
    ['backing-style', 'Style'],
    ['backing-tempo', 'Tempo'],
    ['scope', 'PDF contents'],
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
  await page.locator('#language-trigger').click();
  await list.getByRole('option', { name: 'Português' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  const roots = page.getByRole('group', { name: 'Tônica', exact: true });
  await expect(roots.getByRole('radio')).toHaveCount(12);
  await roots.getByRole('radio', { name: 'C', exact: true }).press('ArrowRight');
  const nextRoot = roots.getByRole('radio', { name: 'C♯ / D♭', exact: true });
  await expect(nextRoot).toBeChecked();
  await expect(nextRoot).toBeFocused();
  await page.locator('#scope-trigger').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('#scope')).toHaveValue('catalog');
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
  const icon = page.locator('#theme-icon');
  await expect(icon).toHaveClass(/fa-sun/);
  await expect(toggle).toHaveText('Light');
  await expect(toggle).toHaveAccessibleName('Theme: Light. Switch to Dark.');
  expect(
    await page.evaluate(async () => {
      const faces = await document.fonts.load('900 16px "Font Awesome 6 Free"');
      return faces.length > 0 && faces.every((face) => face.status === 'loaded');
    }),
  ).toBe(true);

  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(icon).toHaveClass(/fa-moon/);
  await expect(toggle).toHaveText('Dark');
  await expect(toggle).toHaveAccessibleName('Theme: Dark. Switch to Light.');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(icon).toHaveClass(/fa-moon/);
  expect(new URL(page.url()).searchParams.has('theme')).toBe(false);
});

test('keyboard theme changes persist without replacing the selected fretboard', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
  const noteColors = () =>
    page.locator('#board .note:not(.muted)').evaluateAll((notes) =>
      notes.map((note) => {
        const pitch = Number(note.dataset.midi) % 12;
        const dot = document.querySelector(
          `#notes-strip [data-pitch="${pitch}"] .color-dot`,
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
  await expect(page.locator('#theme-icon')).toHaveClass(/fa-moon/);
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
  expect(await noteColors()).toEqual(lightColors);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Theme: Light. Switch to Dark.');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await toggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#theme-icon')).toHaveClass(/fa-sun/);
});

test('an explicit theme survives music and language changes with localized control names', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url());
  await page.locator('#theme-toggle').click();
  const names = [];
  for (const [lang, mode] of [
    ['en', 'Dark'],
    ['pt', 'Escuro'],
    ['es', 'Oscuro'],
  ]) {
    await page.locator('#language').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-toggle')).toHaveText(mode);
    const name = await page.locator('#theme-toggle').getAttribute('aria-label');
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/undefined|\{.*\}/);
    names.push(name);
  }
  expect(new Set(names).size).toBe(3);
  await page.getByRole('radio', { name: 'A', exact: true }).check();
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
    await expect(page.locator('#theme-icon')).toHaveClass(/fa-sun/);
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-icon')).toHaveClass(/fa-moon/);
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
  await expect(page.locator('#theme-icon')).toHaveClass(/fa-sun/);
});

test('dark appearance keeps controls contained and preserves mirrored pattern geometry', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('scales.theme', 'dark'));
  for (const state of [
    { width: 320, lang: 'en', hand: 'right' },
    { width: 390, lang: 'pt', hand: 'left' },
    { width: 1360, lang: 'es', hand: 'left' },
  ]) {
    await page.setViewportSize({ width: state.width, height: 900 });
    await page.goto(url({ lang: state.lang, hand: state.hand }));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#0a140e',
    );
    await expect(page.locator('body')).toHaveCSS(
      'background-image',
      /repeating-linear-gradient/,
    );
    await expect(page.locator('#scale-selection')).toHaveCSS('font-family', /monospace/);
    await expect(page.locator('#board .note:not(.muted)')).toHaveCount(17);
    await expect(page.locator('#neck-octave-label')).toHaveText(
      state.hand === 'left' ? '12–0' : '0–12',
    );
    expect(
      await page
        .locator('#board .fretboard-map')
        .evaluate((board) => board.getBoundingClientRect().width),
    ).toBe(657);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    const toggle = await page.locator('#theme-toggle').boundingBox();
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
    targets.push(getComputedStyle(document.querySelector('#neck-view'), '::before'));
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

test('root notes are circles, scale choices share a height, and paired note names fit in pills', async ({
  page,
}) => {
  const sizes = (buttons) =>
    buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return {
          label: element.textContent.trim(),
          width,
          height,
          fits:
            element.scrollWidth <= element.clientWidth + 1 &&
            element.scrollHeight <= element.clientHeight + 1,
        };
      }),
    );
  for (const [width, lang] of [
    [1360, 'en'],
    [320, 'es'],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url({ lang, scale: 'chromatic' }));
    const roots = page.locator('#root-notes label > span');
    await expect(roots).toHaveCount(12);
    await page.evaluate(() => document.fonts.ready);
    for (const root of await sizes(roots)) {
      expect(root.width, root.label).toBeCloseTo(root.height, 0);
      expect(root.height, root.label).toBeGreaterThanOrEqual(44);
      expect(root.fits, root.label).toBe(true);
    }
    const choices = await sizes(page.locator('#scale-results button'));
    expect(choices.length).toBeGreaterThan(1);
    for (const choice of choices) {
      expect(choice.height, choice.label).toBeCloseTo(choices[0].height, 0);
      expect(choice.fits, choice.label).toBe(true);
    }
    const tones = page.locator('#notes-strip button');
    await expect(tones).toHaveCount(12);
    for (const tone of await sizes(tones)) {
      if (tone.label.includes('/'))
        expect(tone.width, tone.label).toBeGreaterThan(tone.height);
      else expect(tone.width, tone.label).toBeCloseTo(tone.height, 0);
      expect(tone.fits, tone.label).toBe(true);
    }
    await page
      .locator('#labels label')
      .filter({ has: page.locator('[value="degrees"]') })
      .click();
    for (const degree of await sizes(tones)) {
      expect(degree.width, degree.label).toBeCloseTo(degree.height, 0);
      expect(degree.fits, degree.label).toBe(true);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  }
});
