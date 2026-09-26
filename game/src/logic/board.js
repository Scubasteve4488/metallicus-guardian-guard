// Evidence Board rules. Pure functions: no Phaser, so they run under `node --test`.

export function pairKey(a, b) {
  return [a, b].sort().join('+');
}

// Returns { kind, text, route? } where kind is 'contradiction' | 'supports' |
// 'unsupported' (a claim nothing backs) | 'unrelated'.
export function evaluateLink(caseData, a, b) {
  if (a === b) return { kind: 'unrelated', text: caseData.unrelatedText };
  if (caseData.uncertainCorrect.includes(a) || caseData.uncertainCorrect.includes(b)) {
    return { kind: 'unsupported', text: caseData.rumorLinkText };
  }
  const key = pairKey(a, b);
  const link = caseData.links.find((l) => pairKey(l.a, l.b) === key);
  if (!link) return { kind: 'unrelated', text: caseData.unrelatedText };
  return { kind: link.kind, text: link.text, route: link.route };
}

// board = { links: [{a, b, kind, route}], uncertain: Set|Array }
export function boardObjectives(caseData, board) {
  const uncertain = new Set(board.uncertain);
  const contradiction = board.links.some((l) => l.kind === 'contradiction');
  const route = board.links.some((l) => l.kind === 'supports' && l.route);
  const uncertainDone = caseData.uncertainCorrect.every((id) => uncertain.has(id));
  return { contradiction, route, uncertain: uncertainDone };
}

export function boardComplete(caseData, board) {
  const o = boardObjectives(caseData, board);
  return o.contradiction && o.route && o.uncertain;
}

// The route the linked evidence supports, or null. Used by the Key node.
export function supportedRoute(board) {
  const l = board.links.find((x) => x.kind === 'supports' && x.route);
  return l ? l.route : null;
}
