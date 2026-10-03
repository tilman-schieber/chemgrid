import { CATEGORIES } from "./categories.js";

export const MIN_ANSWERS = 3; // every cell must have at least this many valid answers
// ... and at least this many among the elements people actually know, so a
// cell can always be solved without the lanthanides and the synthetic heavies.
export const MIN_CORE = 3;
export const CORE = (e) => e.number <= 36 || ["Ag", "Sn", "I", "Xe", "Cs", "Ba", "W", "Pt", "Au", "Hg", "Pb", "Bi", "Rn", "Ra", "U", "Pu"].includes(e.id);
export const MAX_ANSWERS = 25; // and at most this many: beyond that a cell is a free square
export const MAX_BIG_CELLS = 2; // cells with more than BIG_CELL answers allowed per board
export const BIG_CELL = 15;
export const MAX_GUESSES = 10;
// Two categories are redundant when this share of the smaller one also fits the
// larger ("Noble gas" with "Group 18"); a board never contains such a pair.
export const MAX_OVERLAP = 0.85;

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Can the nine cells be filled with nine different elements?
function hasDistinctFill(cellAnswers) {
  const order = cellAnswers.map((a, i) => i).sort((a, b) => cellAnswers[a].length - cellAnswers[b].length);
  const used = new Set();
  const place = (k) => {
    if (k === order.length) return true;
    for (const c of cellAnswers[order[k]]) {
      if (used.has(c.id)) continue;
      used.add(c.id);
      if (place(k + 1)) return true;
      used.delete(c.id);
    }
    return false;
  };
  return place(0);
}

export function createEngine(elements) {
  const matches = new Map(CATEGORIES.map((cat) => [cat.id, new Set(elements.filter(cat.test).map((c) => c.id))]));
  const usable = CATEGORIES.filter((cat) => matches.get(cat.id).size >= MIN_ANSWERS);
  const byId = new Map(CATEGORIES.map((cat) => [cat.id, cat]));
  const overlap = (a, b) => {
    const A = matches.get(a.id), B = matches.get(b.id);
    let both = 0;
    for (const id of A) if (B.has(id)) both++;
    return both / Math.min(A.size, B.size);
  };
  const redundant = new Set();
  for (const a of usable) for (const b of usable) if (a !== b && overlap(a, b) >= MAX_OVERLAP) redundant.add(`${a.id}|${b.id}`);

  const answers = (rowId, colId) => {
    const a = matches.get(rowId), b = matches.get(colId);
    return elements.filter((c) => a.has(c.id) && b.has(c.id));
  };

  // A pair of categories can share a board when their cell is the right size
  // and neither implies the other.
  const fits = (a, b) => {
    const cell = answers(a.id, b.id);
    return cell.length >= MIN_ANSWERS && cell.length <= MAX_ANSWERS && cell.filter(CORE).length >= MIN_CORE && !redundant.has(`${a.id}|${b.id}`);
  };
  const shuffled = (rand, list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Same seed + same data always yields the same board. Rows are drawn first;
  // columns are then drawn only from categories that fit all three rows, which
  // is what makes boards findable in a small pool like the elements.
  function generateBoard(seed) {
    const rand = mulberry32(hashString(String(seed)));
    for (let attempt = 0; attempt < 500; attempt++) {
      const picked = [];
      const groups = {};
      const allowed = (cat) => !picked.includes(cat) && (groups[cat.group] || 0) < 2 && !picked.some((p) => redundant.has(`${p.id}|${cat.id}`));
      const take = (cat) => {
        groups[cat.group] = (groups[cat.group] || 0) + 1;
        picked.push(cat);
      };
      for (const cat of shuffled(rand, usable)) {
        if (picked.length === 3) break;
        if (allowed(cat)) take(cat);
      }
      const rows = picked.slice(0, 3);
      for (const cat of shuffled(rand, usable)) {
        if (picked.length === 6) break;
        if (allowed(cat) && rows.every((r) => fits(r, cat))) take(cat);
      }
      if (picked.length < 6) continue;
      const cols = picked.slice(3);
      const cells = rows.flatMap((r) => cols.map((c) => answers(r.id, c.id)));
      if (cells.filter((a) => a.length > BIG_CELL).length > MAX_BIG_CELLS) continue;
      if (!hasDistinctFill(cells)) continue;
      return { seed: String(seed), rows: rows.map((c) => c.id), cols: cols.map((c) => c.id) };
    }
    throw new Error("could not generate a board");
  }

  // Every valid answer of a cell, in atomic-number order.
  const answersSorted = (rowId, colId) => answers(rowId, colId).sort((a, b) => a.number - b.number);

  return { generateBoard, answers: answersSorted, cellSize: (r, c) => answers(r, c).length, category: (id) => byId.get(id), count: (id) => matches.get(id).size, usable, redundant };
}
