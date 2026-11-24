// SPDX-License-Identifier: MPL-2.0

// Keep the native radios for keyboard input. A horizontal drag previews the
// destination, and releasing commits it through the same radio change handler.
export function enableSlideSwitch(group) {
  const control = group.querySelector('.switch-control');
  const radios = control.querySelectorAll('input[type="radio"]');
  let gesture;

  function sideAt(x) {
    const { left, width } = control.getBoundingClientRect();
    return Number(x >= left + width / 2);
  }

  function clear(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = undefined;
    delete control.dataset.preview;
    if (control.hasPointerCapture(event.pointerId))
      control.releasePointerCapture(event.pointerId);
  }

  function move(event) {
    if (gesture?.id !== event.pointerId || gesture.scrolling) return;
    if (control.dataset.preview === undefined) {
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (Math.max(dx, dy) < 5) return;
      if (dy > dx) {
        gesture.scrolling = true;
        return;
      }
    }
    control.dataset.preview = String(sideAt(event.clientX));
  }

  control.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrolling: false,
    };
    control.setPointerCapture(event.pointerId);
  });
  control.addEventListener('pointermove', move);
  control.addEventListener('pointerup', (event) => {
    if (gesture?.id !== event.pointerId) return;
    move(event);
    const select = !gesture.scrolling && event.button === 0;
    clear(event);
    if (select) {
      const radio = radios[sideAt(event.clientX)];
      radio.focus({ preventScroll: true });
      radio.click();
    }
  });
  control.addEventListener('pointercancel', clear);
  control.addEventListener('lostpointercapture', clear);
}
