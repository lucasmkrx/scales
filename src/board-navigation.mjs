// Move in screen coordinates. Sparse scales may skip frets or entire strings.
export function adjacentNote(notes, current, key, hand) {
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const axis = horizontal ? 'fret' : 'row';
  let direction = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
  if (horizontal && hand === 'left') direction *= -1;
  const candidates = notes.filter(
    (note) =>
      (note[axis] - current[axis]) * direction > 0 &&
      (!horizontal || note.row === current.row),
  );
  candidates.sort(
    (a, b) =>
      direction * (a[axis] - b[axis]) ||
      Math.abs(a.fret - current.fret) - Math.abs(b.fret - current.fret),
  );
  return candidates[0];
}

export function enableBoardNavigation(board, playNote) {
  board.addEventListener('focusin', (event) => {
    const note = event.target.closest('[data-midi]');
    if (!note || note.tabIndex === 0) return;
    board.querySelector('[tabindex="0"]')?.setAttribute('tabindex', '-1');
    note.setAttribute('tabindex', '0');
  });
  board.addEventListener('click', (event) => {
    const note = event.target.closest('[data-midi]');
    if (!note) return;
    note.focus({ preventScroll: true });
    playNote(Number(note.dataset.midi), note);
  });
  board.addEventListener('keydown', (event) => {
    const note = event.target.closest('[data-midi]');
    if (!note || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) playNote(Number(note.dataset.midi), note);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const notes = Array.from(board.querySelectorAll('[data-midi]'), (element) => ({
      row: Number(element.dataset.row),
      fret: Number(element.dataset.fret),
      element,
    }));
    const current = notes.find(({ element }) => element === note);
    adjacentNote(
      notes,
      current,
      event.key,
      note.ownerSVGElement.dataset.hand,
    )?.element.focus();
  });
}
