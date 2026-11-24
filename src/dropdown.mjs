// SPDX-License-Identifier: MPL-2.0

const gap = 8;

function visibleViewport() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  return new DOMRect(
    viewport?.offsetLeft ?? 0,
    viewport?.offsetTop ?? 0,
    Math.min(root.clientWidth, viewport?.width ?? root.clientWidth),
    Math.min(root.clientHeight, viewport?.height ?? root.clientHeight),
  );
}

function placeDropdown(
  popup,
  rect,
  wantedHeight,
  viewport,
  alignEnd = false,
  minHeight = 88,
) {
  const width = popup.offsetWidth;
  const maxLeft = viewport.right - gap - width;
  const left = alignEnd || rect.left > maxLeft ? rect.right - width : rect.left;
  popup.style.left = `${Math.max(viewport.left + gap, Math.min(left, maxLeft))}px`;
  const header =
    parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const top = Math.max(viewport.top + gap, header);
  const bottom = viewport.bottom - gap;
  const aboveEnd = Math.min(rect.top - gap, bottom);
  const belowStart = Math.max(rect.bottom + gap, top);
  const above = aboveEnd - top;
  const below = bottom - belowStart;
  const opensAbove = wantedHeight > below && above > below;
  const available = opensAbove ? above : below;
  // Keep the tuning editor and short menus reachable within the visible area.
  if (available < Math.min(minHeight, wantedHeight)) {
    popup.style.maxHeight = `${Math.max(0, Math.min(wantedHeight, viewport.height - 2 * gap))}px`;
    popup.style.top = `${viewport.top + gap}px`;
    return;
  }
  popup.style.maxHeight = `${Math.max(0, Math.min(wantedHeight, available))}px`;
  popup.style.top = `${opensAbove ? aboveEnd - popup.offsetHeight : belowStart}px`;
}

export function enableInstrumentDropdown(trigger, panel) {
  const tuningEditor = panel.querySelector('#custom-tuning');
  let layoutWidth;
  function place() {
    if (!panel.matches(':popover-open')) return;
    const root = document.documentElement;
    let rect = trigger.getBoundingClientRect();
    const field = panel.querySelector('[data-string-pitch]:focus');
    const reflowed = layoutWidth !== root.clientWidth;
    layoutWidth = root.clientWidth;
    // Rotating a phone can move the entire fretboard header above the viewport.
    if (!field && reflowed && (rect.top < 0 || rect.bottom > root.clientHeight)) {
      trigger.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
      rect = trigger.getBoundingClientRect();
    }
    if (!field && (rect.bottom <= 0 || rect.top >= root.clientHeight)) {
      panel.hidePopover();
      return;
    }
    const viewport = visibleViewport();
    panel.style.maxWidth = `${Math.max(0, viewport.width - 2 * gap)}px`;
    const height = panel.scrollHeight + panel.offsetHeight - panel.clientHeight;
    placeDropdown(panel, rect, height, viewport, true, tuningEditor.hidden ? 88 : height);
    // A phone keyboard can cover the focused pitch without resizing the page.
    if (field) {
      const input = field.getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      if (input.bottom > bounds.bottom - gap)
        panel.scrollTop += input.bottom - bounds.bottom + gap;
      else if (input.top < bounds.top + gap)
        panel.scrollTop += input.top - bounds.top - gap;
    }
  }
  panel.addEventListener('beforetoggle', (event) => {
    if (event.newState === 'open') layoutWidth = document.documentElement.clientWidth;
  });
  panel.addEventListener('toggle', () => {
    const open = panel.matches(':popover-open');
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      place();
      if (document.activeElement === panel || !panel.contains(document.activeElement)) {
        const focus = tuningEditor.hidden
          ? panel.querySelector('input:checked')
          : tuningEditor.querySelector('#custom-tuning-title');
        focus.focus({ preventScroll: true });
      }
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    panel.hidePopover();
    trigger.focus({ preventScroll: true });
  });
  document.addEventListener('focusin', ({ target }) => {
    // Safari can focus the workspace ancestor while activating the toggle by touch.
    if (
      panel.matches(':popover-open') &&
      !panel.contains(target) &&
      !target.contains(trigger)
    )
      panel.hidePopover();
  });
  new ResizeObserver(place).observe(panel.querySelector('form'));
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });
  window.visualViewport?.addEventListener('resize', place);
  window.visualViewport?.addEventListener('scroll', place);
}

/** One listbox for settings throughout the explorer, including the tuning presets. */
export function createDropdowns() {
  const popup = document.createElement('div');
  popup.className = 'choice-popup';
  popup.hidden = true;
  const list = document.createElement('div');
  list.className = 'choice-list';
  list.id = 'choice-list';
  list.setAttribute('role', 'listbox');
  popup.append(list);
  document.body.append(popup);

  let active;
  let prefix = '';
  let lastTyped = 0;
  const nativeTriggers = [];

  function close(returnFocus = false) {
    if (!active) return;
    const { trigger } = active;
    active = null;
    popup.hidden = true;
    prefix = '';
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function place() {
    if (!active) return;
    const viewport = visibleViewport();
    const rect = active.trigger.getBoundingClientRect();
    const panel = active.trigger.closest('[popover]')?.getBoundingClientRect();
    const top = panel?.top ?? 0;
    const bottom = panel?.bottom ?? document.documentElement.clientHeight;
    if (rect.bottom <= top || rect.top >= bottom) {
      close();
      return;
    }
    const width = Math.min(viewport.width - 2 * gap, Math.max(208, rect.width));
    popup.style.width = `${width}px`;
    const frame = popup.offsetHeight - list.clientHeight;
    const wanted = Math.min(304, list.scrollHeight + frame);
    placeDropdown(popup, rect, wanted, viewport);
  }

  function focusOption(option) {
    if (!option) return;
    option.focus({ preventScroll: true });
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    const bottom = option.offsetTop + option.offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }

  function setChoiceLabel(name, label, flag) {
    if (
      name.textContent === label &&
      name.firstElementChild?.getAttribute('src') === flag
    )
      return;
    name.textContent = label;
    if (flag) {
      const image = document.createElement('img');
      image.className = 'language-flag';
      image.alt = '';
      image.src = flag;
      name.prepend(image);
    }
  }

  function row({ value, label, detail, lang, flag, disabled, selected }) {
    const option = document.createElement('button');
    option.type = 'button';
    option.tabIndex = -1;
    option.value = value;
    option.disabled = Boolean(disabled);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(selected));
    if (lang) option.lang = lang;
    const name = document.createElement('span');
    setChoiceLabel(name, label, flag);
    const check = document.createElement('i');
    check.className = 'choice-check icon fa-solid fa-check';
    check.setAttribute('aria-hidden', 'true');
    option.append(name, check);
    if (detail) {
      const extra = document.createElement('small');
      extra.textContent = detail;
      option.append(extra);
    }
    return option;
  }

  function open(picker) {
    close();
    active = picker;
    const { trigger, getChoices, labelId } = picker;
    // A nested tuning list belongs to the settings popover's focus and dismissal scope.
    (trigger.closest('[popover]') ?? document.body).append(popup);
    list.setAttribute('aria-labelledby', labelId);
    list.replaceChildren(...getChoices().map(row));
    popup.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    place();
    focusOption(
      list.querySelector('button[aria-selected="true"]:enabled') ||
        list.querySelector('button:enabled'),
    );
  }

  function register(trigger, labelId, getChoices, onChoose) {
    const picker = { trigger, labelId, getChoices, onChoose };
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', list.id);
    trigger.addEventListener('click', () =>
      active === picker ? close(true) : open(picker),
    );
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        open(picker);
      }
    });
  }

  function enhance(select) {
    const label = select.labels[0];
    if (!label) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = `${select.id}-trigger`;
    trigger.className = 'select-trigger';
    const caption = document.createElement('span');
    caption.id = `${select.id}-value`;
    trigger.append(caption);
    label.id ||= `${select.id}-label`;
    label.htmlFor = trigger.id;
    trigger.setAttribute('aria-labelledby', `${label.id} ${caption.id}`);
    if (select.hasAttribute('aria-describedby'))
      trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.classList.add('select-model');
    select.after(trigger);
    const sync = () => {
      const selected = select.selectedOptions[0];
      setChoiceLabel(caption, selected?.label ?? '', selected?.dataset.flag);
      trigger.disabled = select.disabled;
      if (active?.trigger === trigger) close();
    };
    nativeTriggers.push(sync);
    select.addEventListener('change', sync);
    sync();
    register(
      trigger,
      label.id,
      () =>
        Array.from(select.options, (item) => ({
          value: item.value,
          label: item.label,
          lang: item.lang,
          flag: item.dataset.flag,
          selected: item.selected,
          disabled: item.disabled,
        })),
      (value) => {
        if (value === select.value) return;
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      },
    );
  }

  list.addEventListener('click', (event) => {
    const option = event.target.closest('button:enabled');
    if (!active || !option) return;
    const { onChoose } = active;
    close(true);
    onChoose(option.value);
  });
  list.addEventListener('keydown', (event) => {
    const options = [...list.querySelectorAll('button:enabled')];
    const current = options.indexOf(event.target);
    let next;
    switch (event.key) {
      case 'ArrowDown':
        next = options[Math.min(options.length - 1, current + 1)];
        break;
      case 'ArrowUp':
        next = options[Math.max(0, current - 1)];
        break;
      case 'Home':
        next = options[0];
        break;
      case 'End':
        next = options.at(-1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        return;
      case 'Tab':
        close(true);
        return;
      default: {
        if (
          event.key.length !== 1 ||
          event.key === ' ' ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey
        )
          return;
        const key = event.key.toLocaleLowerCase();
        const now = performance.now();
        prefix = now - lastTyped > 700 || prefix === key ? key : prefix + key;
        lastTyped = now;
        const start = current + (prefix.length === 1 ? 1 : 0);
        next = [...options.slice(start), ...options.slice(0, start)].find((option) =>
          option.firstElementChild.textContent.toLocaleLowerCase().startsWith(prefix),
        );
      }
    }
    if (next) {
      event.preventDefault();
      focusOption(next);
    }
  });

  function dismissOutside(event) {
    if (active && !active.trigger.contains(event.target) && !popup.contains(event.target))
      close();
  }
  document.addEventListener('pointerdown', dismissOutside);
  document.addEventListener('focusin', dismissOutside);
  document.addEventListener(
    'beforetoggle',
    (event) => {
      if (event.newState === 'closed' && active && event.target.contains(active.trigger))
        close();
    },
    true,
  );
  // Measure after the outer instrument dropdown has moved with its button.
  const schedulePlacement = () => {
    if (active) requestAnimationFrame(place);
  };
  window.addEventListener('resize', schedulePlacement);
  window.visualViewport?.addEventListener('resize', schedulePlacement);
  window.visualViewport?.addEventListener('scroll', schedulePlacement);
  document.addEventListener(
    'scroll',
    (event) => {
      if (active && event.target.contains(active.trigger)) schedulePlacement();
    },
    { capture: true, passive: true },
  );
  document.querySelectorAll('select:not([multiple])').forEach(enhance);
  return { register, refresh: () => nativeTriggers.forEach((sync) => sync()) };
}
