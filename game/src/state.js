// One run of the case. Kept in memory only; the prototype does not save.

export const PHASES = ['title', 'investigate', 'board', 'contain', 'authorize', 'relay', 'report', 'restored', 'done'];

export const run = {};

export function resetRun() {
  Object.assign(run, {
    phase: 'investigate',
    talked: new Set(),
    clues: new Set(),
    cards: [],
    board: { links: [], uncertain: new Set() },
    guardPos: { x: 240, y: 262, facing: 'up' },
    introShown: false,
    metrics: {
      startedAt: Date.now(),
      finishedAt: null,
      hints: 0,
      unrelatedLinks: 0,
      wrongRoutes: 0,
      containment: null,
      reportFirstPct: null,
      reportAttempts: 0,
      nextStep: null,
    },
  });
  return run;
}

export function addCard(id) {
  if (!run.cards.includes(id)) run.cards.push(id);
}

// Evidence quality: starts at 100 and drops for guesses (links nothing supports,
// routes nothing supports). Hints do not cost points; they are tracked for playtests.
export function evidenceQuality() {
  const m = run.metrics;
  return Math.max(0, 100 - m.unrelatedLinks * 5 - m.wrongRoutes * 10);
}

resetRun();
