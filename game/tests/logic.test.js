import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateLink, boardObjectives, boardComplete, supportedRoute } from '../src/logic/board.js';
import { resolveImpact, containmentSummary, REFLECT_WINDOW_MS } from '../src/logic/containment.js';
import { gradeReport, nextStepOptions, CATEGORY_IDS } from '../src/logic/report.js';

const caseData = JSON.parse(readFileSync(new URL('../data/case01.json', import.meta.url)));

test('the source/record pair is the contradiction, in either order', () => {
  assert.equal(evaluateLink(caseData, 'source', 'record').kind, 'contradiction');
  assert.equal(evaluateLink(caseData, 'record', 'source').kind, 'contradiction');
});

test('witness + trail supports the East Alley route', () => {
  const r = evaluateLink(caseData, 'trail', 'witness');
  assert.equal(r.kind, 'supports');
  assert.equal(r.route, 'east');
});

test('the rumor cannot be linked to anything', () => {
  for (const other of ['source', 'record', 'witness', 'trail']) {
    assert.equal(evaluateLink(caseData, 'rumor', other).kind, 'unsupported');
  }
});

test('unconnected evidence is rejected', () => {
  assert.equal(evaluateLink(caseData, 'witness', 'record').kind, 'unrelated');
  assert.equal(evaluateLink(caseData, 'source', 'source').kind, 'unrelated');
});

test('board completes only with contradiction + route + rumor marked uncertain', () => {
  const board = { links: [], uncertain: new Set() };
  assert.equal(boardComplete(caseData, board), false);
  board.links.push({ ...evaluateLink(caseData, 'source', 'record'), a: 'source', b: 'record' });
  assert.deepEqual(boardObjectives(caseData, board), { contradiction: true, route: false, uncertain: false });
  // a supports link with no route does not satisfy the route goal
  board.links.push({ ...evaluateLink(caseData, 'source', 'witness'), a: 'source', b: 'witness' });
  assert.equal(boardObjectives(caseData, board).route, false);
  board.links.push({ ...evaluateLink(caseData, 'witness', 'trail'), a: 'witness', b: 'trail' });
  assert.equal(boardComplete(caseData, board), false);
  board.uncertain.add('rumor');
  assert.equal(boardComplete(caseData, board), true);
  assert.equal(supportedRoute(board), 'east');
});

test('only East Alley has supporting evidence among the routes', () => {
  const supported = caseData.routes.filter((r) => r.evidence.length).map((r) => r.id);
  assert.deepEqual(supported, ['east']);
});

test('shield: wrong lane or lowered shield lets the signal past', () => {
  assert.equal(resolveImpact({ signalLane: 0, guardLane: 1, shieldUp: true, msSinceRaise: 10 }), 'passed');
  assert.equal(resolveImpact({ signalLane: 0, guardLane: 0, shieldUp: false, msSinceRaise: 10 }), 'passed');
});

test('shield: raised inside the window reflects, earlier just blocks', () => {
  assert.equal(resolveImpact({ signalLane: 1, guardLane: 1, shieldUp: true, msSinceRaise: REFLECT_WINDOW_MS }), 'reflected');
  assert.equal(resolveImpact({ signalLane: 1, guardLane: 1, shieldUp: true, msSinceRaise: REFLECT_WINDOW_MS + 1 }), 'blocked');
});

test('containment summary counts outcomes', () => {
  const s = containmentSummary(['reflected', 'blocked', 'passed', 'blocked']);
  assert.deepEqual(s, { reflected: 1, blocked: 2, passed: 1, total: 4, protectedPct: 75 });
});

test('containment event is short: last signal spawns before 30 s', () => {
  const last = caseData.containment.pattern.at(-1)[0];
  assert.ok(last < 30, `last spawn at ${last}s`);
  for (const [, lane] of caseData.containment.pattern) assert.ok(lane === 0 || lane === 1);
});

test('report uses exactly the four locked categories, in order', () => {
  assert.deepEqual(caseData.report.categories.map((c) => c.title),
    ['Verified Facts', 'Attention Items', 'Could Not Verify', 'Confirm Next']);
  assert.deepEqual(caseData.report.categories.map((c) => c.id), CATEGORY_IDS);
  for (const f of caseData.report.findings) assert.ok(CATEGORY_IDS.includes(f.answer), f.id);
  for (const id of CATEGORY_IDS) {
    assert.ok(caseData.report.findings.some((f) => f.answer === id), `no finding for ${id}`);
  }
});

test('report grading', () => {
  const perfect = Object.fromEntries(caseData.report.findings.map((f) => [f.id, f.answer]));
  assert.equal(gradeReport(caseData.report, perfect).pct, 100);
  const partial = { ...perfect, f6: 'verified' };
  const g = gradeReport(caseData.report, partial);
  assert.equal(g.correct, g.total - 1);
  assert.equal(g.results.find((r) => r.id === 'f6').correct, false);
  const missing = { ...perfect };
  delete missing.f1;
  assert.equal(gradeReport(caseData.report, missing).allPlaced, false);
});

test('next-step choices come only from Confirm Next', () => {
  const opts = nextStepOptions(caseData.report);
  assert.ok(opts.length >= 2);
  for (const o of opts) assert.equal(o.answer, 'confirm');
});
