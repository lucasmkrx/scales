// Apply the saved theme before styles paint. New sessions start in light mode.
(() => {
  const root = document.documentElement;
  const key = 'scales.theme';
  const normalize = (value) => (value === 'dark' ? 'dark' : 'light');
  let preference = 'light';
  try {
    const saved = localStorage.getItem(key);
    preference = normalize(saved);
    if (saved !== null && saved !== preference) localStorage.setItem(key, preference);
  } catch {}
  const apply = () => {
    root.dataset.theme = preference;
    root.dataset.themePreference = preference;
    root.style.colorScheme = preference;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', preference === 'dark' ? '#142019' : '#fffefa');
    window.dispatchEvent(new Event('themechange'));
  };
  window.tukanyTheme = Object.freeze({
    get preference() {
      return preference;
    },
    get nextPreference() {
      return preference === 'light' ? 'dark' : 'light';
    },
    setPreference(value) {
      preference = normalize(value);
      try {
        localStorage.setItem(key, preference);
      } catch {}
      apply();
    },
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = normalize(event.newValue);
    apply();
  });
  apply();
})();
