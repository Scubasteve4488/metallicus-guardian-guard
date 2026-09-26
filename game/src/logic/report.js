// Clarity Report scoring. Pure functions.

export const CATEGORY_IDS = ['verified', 'attention', 'unverified', 'confirm'];

// placements: { findingId: categoryId }
export function gradeReport(report, placements) {
  const results = report.findings.map((f) => ({
    id: f.id,
    placed: placements[f.id] || null,
    answer: f.answer,
    correct: placements[f.id] === f.answer,
    why: f.why,
  }));
  const correct = results.filter((r) => r.correct).length;
  return {
    results,
    correct,
    total: results.length,
    allPlaced: results.every((r) => r.placed),
    pct: Math.round((correct / results.length) * 100),
  };
}

// Next-step choices are the findings that belong in Confirm Next. The player
// picks one; the game never picks for them.
export function nextStepOptions(report) {
  return report.findings.filter((f) => f.nextStep);
}
