import { CATEGORIES } from "./categories.js";

export const MIN_ANSWERS = 4; // every cell must have at least this many valid answers
export const MAX_ANSWERS = 25; // and at most this many: beyond that a cell is a free square
export const MAX_BIG_CELLS = 2; // cells with more than BIG_CELL answers allowed per board
export const BIG_CELL = 15;
export const MAX_GUESSES = 10;
// Broad categories with many well-known members ("Discovered in the 19th
// century") fit almost any row, so without a limit they end up on every board.
export const BROAD = 40; // members
export const MAX_BROAD = 1; // per board
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
    return cell.length >= MIN_ANSWERS && cell.length <= MAX_ANSWERS && !redundant.has(`${a.id}|${b.id}`);
  };
  // Weighted shuffle in which every group is equally likely to come first,
  // however many categories it has.
  const groupSize = {};
  for (const cat of usable) groupSize[cat.group] = (groupSize[cat.group] || 0) + 1;
  const shuffled = (rand, list) =>
    list.map((cat) => [-Math.log(1 - rand()) * groupSize[cat.group], cat]).sort((a, b) => a[0] - b[0]).map(([, cat]) => cat);

  // Same seed + same data always yields the same board. Each board is built
  // around an anchor drawn at random: three columns that fit it, then two more
  // rows that fit all three columns. Drawing rows at random instead lets the
  // few broad categories that fit almost anything take over every board.
  const ATTEMPTS_PER_ANCHOR = 200;
  function generateBoard(seed) {
    const rand = mulberry32(hashString(String(seed)));
    for (const anchor of shuffled(rand, usable)) {
      for (let attempt = 0; attempt < ATTEMPTS_PER_ANCHOR; attempt++) {
        const picked = [];
        const groups = {};
        const allowed = (cat) => !picked.includes(cat) && (groups[cat.group] || 0) < 2 && !picked.some((p) => redundant.has(`${p.id}|${cat.id}`));
        const take = (cat) => {
          groups[cat.group] = (groups[cat.group] || 0) + 1;
          picked.push(cat);
        };
        take(anchor);
        for (const cat of shuffled(rand, usable)) {
          if (picked.length === 4) break;
          if (allowed(cat) && fits(anchor, cat)) take(cat);
        }
        if (picked.length < 4) break; // this anchor has too few partners
        const cols = picked.slice(1);
        for (const cat of shuffled(rand, usable)) {
          if (picked.length === 6) break;
          if (allowed(cat) && cols.every((c) => fits(cat, c))) take(cat);
        }
        if (picked.length < 6) continue;
        if (picked.filter((cat) => matches.get(cat.id).size >= BROAD).length > MAX_BROAD) continue;
        const rows = [anchor, ...picked.slice(4)];
        const cells = rows.flatMap((r) => cols.map((c) => answers(r.id, c.id)));
        if (cells.filter((a) => a.length > BIG_CELL).length > MAX_BIG_CELLS) continue;
        if (!hasDistinctFill(cells)) continue;
        // The anchor goes to a random row or column.
        const [r, c] = rand() < 0.5 ? [rows, cols] : [cols, rows];
        const order = shuffled(rand, r.map((cat, i) => i).map((i) => r[i]));
        return { seed: String(seed), rows: order.map((cat) => cat.id), cols: shuffled(rand, c).map((cat) => cat.id) };
      }
    }
    throw new Error("could not generate a board");
  }

  // Every valid answer of a cell, in atomic-number order.
  const answersSorted = (rowId, colId) => answers(rowId, colId).sort((a, b) => a.number - b.number);

  return { generateBoard, answers: answersSorted, cellSize: (r, c) => answers(r, c).length, category: (id) => byId.get(id), count: (id) => matches.get(id).size, usable, redundant };
}
