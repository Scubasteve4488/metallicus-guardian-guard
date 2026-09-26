// Records key taps as events, so a press shorter than one frame is never missed
// (polling Key.isDown/JustDown can drop a tap that goes down and up between frames).
export function tapTracker(scene) {
  const pending = new Set();
  const onDown = (ev) => { if (!ev.repeat) pending.add(ev.code); };
  scene.input.keyboard.on('keydown', onDown);
  scene.events.once('shutdown', () => scene.input.keyboard.off('keydown', onDown));
  return {
    // True once per tap of any of the given codes (e.g. 'KeyE', 'Space').
    take(...codes) {
      let hit = false;
      for (const c of codes) if (pending.delete(c)) hit = true;
      return hit;
    },
    clear() { pending.clear(); },
  };
}
