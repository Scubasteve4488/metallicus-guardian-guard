// Shield containment rules. Pure functions.

export const REFLECT_WINDOW_MS = 280;

// What happens when a spoof signal reaches Mini GUARD's shield line.
// Shield raised in the right lane: 'blocked', or 'reflected' if it went up
// within the reflect window. Anything else gets past: 'passed' (civilians are
// delayed; nobody is hurt).
export function resolveImpact({ signalLane, guardLane, shieldUp, msSinceRaise, reflectWindowMs = REFLECT_WINDOW_MS }) {
  if (signalLane !== guardLane || !shieldUp) return 'passed';
  return msSinceRaise <= reflectWindowMs ? 'reflected' : 'blocked';
}

export function containmentSummary(results) {
  const s = { reflected: 0, blocked: 0, passed: 0 };
  for (const r of results) s[r] += 1;
  s.total = results.length;
  s.protectedPct = s.total ? Math.round(((s.reflected + s.blocked) / s.total) * 100) : 100;
  return s;
}
