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
    const viewport = document.documentElement;
    const rect = active.trigger.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= viewport.clientHeight) {
      close();
      return;
    }
    const edge = 8;
    const width = Math.min(viewport.clientWidth - 2 * edge, Math.max(208, rect.width));
    const left =
      rect.left + width <= viewport.clientWidth - edge ? rect.left : rect.right - width;
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(edge, Math.min(left, viewport.clientWidth - width - edge))}px`;
    const safeTop = parseFloat(getComputedStyle(viewport).scrollPaddingTop) || 0;
    const above = rect.top - Math.max(edge, safeTop) - edge;
    const below = viewport.clientHeight - rect.bottom - 2 * edge;
    const frame = popup.offsetHeight - list.clientHeight;
    const wanted = Math.min(304, list.scrollHeight + frame);
    const opensAbove = wanted > below && above > below;
    popup.style.maxHeight = `${Math.max(frame, Math.min(wanted, opensAbove ? above : below))}px`;
    popup.style.top = `${opensAbove ? rect.top - edge - popup.offsetHeight : rect.bottom + edge}px`;
  }

  function focusOption(option) {
    if (!option) return;
    option.focus({ preventScroll: true });
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    const bottom = option.offsetTop + option.offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight)
      list.scrollTop = bottom - list.clientHeight;
  }

  function row({ value, label, detail, lang, disabled, selected }) {
    const option = document.createElement('button');
    option.type = 'button';
    option.tabIndex = -1;
    option.value = value;
    option.disabled = Boolean(disabled);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(selected));
    if (lang) option.lang = lang;
    const name = document.createElement('span');
    name.textContent = label;
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
      caption.textContent = select.selectedOptions[0]?.label ?? '';
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
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, { passive: true });
  document.querySelectorAll('select:not([multiple])').forEach(enhance);
  return { register, refresh: () => nativeTriggers.forEach((sync) => sync()) };
}
