// Apply the device preference before styles paint. Appearance stays local to
// this device, independently of shared musical settings and audio playback.
(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const key = 'scales.theme';
  const normalize = (value) => (['light', 'dark'].includes(value) ? value : 'system');
  let preference = 'system';
  try {
    preference = normalize(localStorage.getItem(key));
  } catch {}
  const resolved = () =>
    preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
  const next = () => {
    const first = system.matches ? 'light' : 'dark';
    const order = ['system', first, first === 'dark' ? 'light' : 'dark'];
    return order[(order.indexOf(preference) + 1) % order.length];
  };
  const apply = () => {
    const theme = resolved();
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#142019' : '#fffefa');
    window.dispatchEvent(new Event('themechange'));
  };
  window.scalesTheme = Object.freeze({
    get preference() {
      return preference;
    },
    get nextPreference() {
      return next();
    },
    setPreference(value) {
      preference = normalize(value);
      try {
        if (preference === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, preference);
      } catch {}
      apply();
    },
  });
  system.addEventListener('change', () => {
    // The action label can change even when an explicit theme is retained.
    apply();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = normalize(event.newValue);
    apply();
  });
  apply();
})();
