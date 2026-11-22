// Labels and keyboards operate the native radios. The track also accepts a tap or drag.
export function enableSlideSwitch(group) {
  const radios = group.querySelectorAll('input[type="radio"]');
  const track = group.querySelector('.switch-track');
  const thumb = track.querySelector('.switch-thumb');
  let gesture;

  function clear(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = undefined;
    track.classList.remove('is-dragging');
    track.style.removeProperty('--slide-position');
    if (track.hasPointerCapture(event.pointerId))
      track.releasePointerCapture(event.pointerId);
  }

  function move(event) {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 4) return;
      if (Math.abs(dy) > Math.abs(dx)) return clear(event);
      gesture.dragging = true;
      track.classList.add('is-dragging');
    }
    gesture.position = Math.max(0, Math.min(1, gesture.start + dx / thumb.offsetWidth));
    track.style.setProperty('--slide-position', `${gesture.position * 100}%`);
  }

  track.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: Number(radios[1].checked),
      dragging: false,
    };
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', move);
  track.addEventListener('pointerup', (event) => {
    // A fast drag can end between pointermove events.
    move(event);
    if (gesture?.id !== event.pointerId) return;
    const index = gesture.dragging ? Math.round(gesture.position) : 1 - gesture.start;
    clear(event);
    if (event.button !== 0) return;
    radios[index].focus({ preventScroll: true });
    radios[index].click();
  });
  track.addEventListener('pointercancel', clear);
  track.addEventListener('lostpointercapture', clear);
}
