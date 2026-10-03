import { CATEGORIES, GROUPS } from "./categories.js";
import { createEngine, MAX_GUESSES } from "./engine.js";

const DAY_KEY = "chemgrid.day."; // + YYYY-MM-DD: that day's game, once a guess has been made
const TIME_ZONE = "Europe/Berlin"; // the day changes at midnight there, wherever you play

const $ = (id) => document.getElementById(id);
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the game still works, it just forgets
  }
};
const normalize = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// Filled tiles take the colour of their family, as on a wall chart.
const FAMILY_CLASS = {
  "alkali metal": "alkali", "alkaline earth metal": "alkaline", "transition metal": "transition",
  "post-transition metal": "post", metalloid: "metalloid", "diatomic nonmetal": "nonmetal", "polyatomic nonmetal": "nonmetal",
  "noble gas": "noble", lanthanide: "lanthanide", actinide: "actinide",
};
const familyClass = (e) => `family-${FAMILY_CLASS[e.category] ?? "unknown"}`;

const elements = await (await fetch("data/elements.json")).json();
const engine = createEngine(elements);
const byId = new Map(elements.map((c) => [c.id, c]));
const searchIndex = elements.map((c) => ({ element: c, name: normalize(c.name), symbol: c.id.toLowerCase() }));

let game; // { board, cells: [elementId|null]*9, guessesLeft, over }
let day; // YYYY-MM-DD of the board on screen; it is also the board's seed
let selected = null;
let match = null; // the one element the typed text identifies, if any

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const shiftDay = (d, by) => new Date(Date.parse(d) + by * 864e5).toISOString().slice(0, 10);
const formatDay = (d) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d));

// A stored game can name categories that have since been removed; it is ignored then.
const playable = (g) => [...g.board.rows, ...g.board.cols].every((id) => engine.category(id));

// Every date has exactly one board. Looking at a day does not store anything;
// the game is saved from the first guess on.
function openDay(d) {
  day = isDay(d) && d <= today() ? d : today();
  const stored = load(DAY_KEY + day, null);
  if (stored && playable(stored)) {
    game = stored;
  } else {
    game = {
      board: engine.generateBoard(day),
      cells: Array(9).fill(null),
      guessesLeft: MAX_GUESSES,
      over: false,
    };
  }
  selected = game.over ? null : game.cells.findIndex((c) => !c);
  const hash = day === today() ? "" : `#${day}`;
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname);
  $("guess").value = "";
  updateMatch();
  setMessage("");
  render();
  // Not when embedded as a preview: focusing would pull the host page's keyboard and scroll.
  if (!game.over && window.self === window.top) $("guess").focus();
}

function persist() {
  save(DAY_KEY + day, game);
}

function cellCategories(i) {
  return [game.board.rows[Math.floor(i / 3)], game.board.cols[i % 3]];
}

function finishIfDone() {
  if (!game.over && (game.guessesLeft === 0 || game.cells.every(Boolean))) game.over = true;
}

function guess(element) {
  if (game.over || selected === null || game.cells[selected]) return;
  const i = selected;
  const [row, col] = cellCategories(i);
  const hit = engine.answers(row, col).some((e) => e.id === element.id);
  game.guessesLeft--;
  if (hit) {
    game.cells[i] = element.id;
    selected = game.cells.findIndex((c) => !c);
    if (selected === -1) selected = null;
    setMessage("");
  } else {
    setMessage(`${element.name} does not fit.`, true);
    shake(i);
  }
  finishIfDone();
  persist();
  render();
}

const filledCount = () => game.cells.filter(Boolean).length;
const guessesUsed = () => MAX_GUESSES - game.guessesLeft;

function setMessage(text, wrong = false) {
  $("message").textContent = text;
  $("message").classList.toggle("wrong", wrong);
}

function shake(i) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`.cell[data-i="${i}"]`);
    if (!el) return;
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 400); // not animationend: it never fires in a background tab
  });
}

function render() {
  const board = $("board");
  board.replaceChildren();
  const span = (className, textContent) => Object.assign(document.createElement("span"), { className, textContent });
  const label = (text, ref) => {
    const el = Object.assign(document.createElement("div"), { className: "label" });
    if (ref) el.append(span("ref", ref), span("", text));
    return el;
  };
  board.append(label(""));
  game.board.cols.forEach((id, n) => board.append(label(engine.category(id).label, String(n + 1))));
  game.cells.forEach((elementId, i) => {
    if (i % 3 === 0) board.append(label(engine.category(game.board.rows[i / 3]).label, "ABC"[i / 3]));
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.i = i;
    if (!elementId) cell.append(span("ref", `${"ABC"[Math.floor(i / 3)]}${(i % 3) + 1}`));
    if (elementId) {
      // A filled cell is drawn like a periodic-table tile: number, symbol, name and mass.
      const c = byId.get(elementId);
      cell.classList.add("filled", familyClass(c));
      cell.append(span("number", c.number), span("symbol", c.id), span("name", c.name), span("mass", c.mass.toFixed(c.mass < 100 ? 2 : 1)));
    }
    if (game.over) cell.classList.add("over");
    if (i === selected) cell.classList.add("selected");
    cell.addEventListener("click", () => selectCell(i));
    board.append(cell);
  });

  $("day").textContent = formatDay(day);
  $("next-day").disabled = day >= today();
  $("to-today").hidden = day >= today();
  $("share").hidden = !game.over;
  $("guesses").textContent = game.over ? "" : `${game.guessesLeft} guesses left`;
  $("score").textContent = game.over ? `${filledCount()}/9 in ${guessesUsed()} guesses` : "";
  $("entry").hidden = game.over;
  $("give-up").hidden = game.over;
  if (game.over && !$("message").textContent) setMessage("Tap a cell to see every element that fits.");
  renderAnswers();
}

function selectCell(i) {
  if (!game.over && game.cells[i]) return;
  selected = i;
  render();
  if (!game.over) $("guess").focus();
}

function renderAnswers() {
  const section = $("answers");
  section.hidden = !(game.over && selected !== null);
  if (section.hidden) return;
  const [row, col] = cellCategories(selected);
  const title = document.createElement("h2");
  title.textContent = `${engine.category(row).label} × ${engine.category(col).label}`;
  const list = document.createElement("ol");
  for (const element of engine.answers(row, col)) {
    const li = document.createElement("li");
    if (game.cells[selected] === element.id) li.className = "mine";
    const name = document.createElement("span");
    name.append(Object.assign(document.createElement("b"), { className: familyClass(element), textContent: element.id }), ` ${element.name}`);
    li.append(name, Object.assign(document.createElement("span"), { textContent: String(element.number) }));
    list.append(li);
  }
  section.replaceChildren(title, list);
}

// Reverse incremental search: nothing is offered while the typed text could
// still mean several elements, so the input never hints at answers. An element
// completes once the text is its symbol, its full name, or a prefix only it has.
function identify(q) {
  if (!q) return null;
  const used = new Set(game.cells.filter(Boolean));
  const open = searchIndex.filter((e) => !used.has(e.element.id));
  const tests = [(e) => e.symbol === q, (e) => e.name === q, (e) => e.name.startsWith(q)];
  for (const test of tests) {
    const hits = open.filter(test);
    if (hits.length) return hits.length === 1 ? hits[0].element : null;
  }
  return null;
}

function updateMatch() {
  match = identify(normalize($("guess").value));
  const ul = $("suggestions");
  ul.replaceChildren();
  if (!match) return;
  const li = Object.assign(document.createElement("li"), { className: "active", textContent: `${match.id} · ${match.name}` });
  li.addEventListener("mousedown", (e) => {
    e.preventDefault();
    choose(match);
  });
  ul.append(li);
}

function choose(element) {
  if (selected === null) {
    setMessage("Pick a cell first.");
    return;
  }
  $("guess").value = "";
  updateMatch();
  guess(element);
}

// Arrow keys walk the selection to the next open cell in that direction.
function moveSelection(dRow, dCol) {
  if (game.over || selected === null) return;
  let row = Math.floor(selected / 3) + dRow, col = (selected % 3) + dCol;
  while (row >= 0 && row < 3 && col >= 0 && col < 3) {
    if (!game.cells[row * 3 + col]) {
      selected = row * 3 + col;
      render();
      return;
    }
    row += dRow;
    col += dCol;
  }
}

const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
$("guess").addEventListener("input", updateMatch);
$("guess").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && match) {
    choose(match);
  } else if (ARROWS[e.key]) {
    // Left and right stay with the text cursor while something is typed.
    if (e.key.match(/Left|Right/) && $("guess").value) return;
    e.preventDefault();
    moveSelection(...ARROWS[e.key]);
  }
});

$("give-up").addEventListener("click", () => {
  game.over = true;
  finishIfDone();
  persist();
  setMessage("");
  render();
});

$("prev-day").addEventListener("click", () => openDay(shiftDay(day, -1)));
$("next-day").addEventListener("click", () => openDay(shiftDay(day, 1)));
$("to-today").addEventListener("click", () => openDay(today()));
window.addEventListener("hashchange", () => openDay(location.hash.slice(1)));

// The shared result shows which cells were filled, never which element it is.
function shareText() {
  const rows = [0, 3, 6].map((i) => game.cells.slice(i, i + 3).map((c) => (c ? "🟩" : "⬜")).join(""));
  const lines = [`Chemgrid ${day}`, `${filledCount()}/9 in ${guessesUsed()} guesses`, ...rows];
  // A link to this day's board, unless the game is only running on this machine.
  if (!/(^|\.)localhost$|^127\.|^\[::1\]$/.test(location.hostname)) lines.push(`${location.origin}${location.pathname}#${day}`);
  return lines.join("\n");
}

$("share").addEventListener("click", async () => {
  const text = shareText();
  try {
    await navigator.clipboard.writeText(text);
    setMessage("Result copied to the clipboard.");
  } catch {
    setMessage(text); // clipboard unavailable: show it so it can be selected
  }
});

// Help: every criterion with the exact rule behind it, filtered as you type.
$("help-intro").textContent =
  "The game has all 118 elements. A criterion is checked the same way for every guess; where a fact is open to " +
  "interpretation, the rule below says which reading the game uses.";

function renderHelp() {
  const words = $("help-search").value.toLowerCase().split(/\s+/).filter(Boolean);
  const list = $("help-list");
  list.replaceChildren();
  for (const [group, { title, how }] of Object.entries(GROUPS)) {
    const hits = CATEGORIES.filter((cat) => {
      if (cat.group !== group) return false;
      const text = `${cat.label} ${title} ${how ?? ""} ${cat.how ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
    if (!hits.length) continue;
    list.append(Object.assign(document.createElement("h3"), { textContent: title }));
    if (how) list.append(Object.assign(document.createElement("p"), { className: "help-group", textContent: how }));
    for (const cat of hits) {
      const item = document.createElement("article");
      const head = document.createElement("header");
      head.append(
        Object.assign(document.createElement("strong"), { textContent: cat.label }),
        Object.assign(document.createElement("span"), { textContent: `${engine.count(cat.id)} of ${elements.length} elements` }),
      );
      item.append(head);
      if (cat.how) item.append(Object.assign(document.createElement("p"), { textContent: cat.how }));
      list.append(item);
    }
  }
  if (!list.children.length) list.append(Object.assign(document.createElement("p"), { className: "help-empty", textContent: "No criterion matches that search." }));
}

$("help-open").addEventListener("click", () => {
  $("help-search").value = "";
  renderHelp();
  $("help").showModal();
  $("help-list").scrollTop = 0;
});
$("help-close").addEventListener("click", () => $("help").close());
$("help").addEventListener("click", (e) => {
  if (e.target === $("help")) $("help").close(); // click on the backdrop
});
$("help").addEventListener("close", () => !game.over && $("guess").focus());
$("help-search").addEventListener("input", renderHelp);

// A date in the URL opens that day's board; otherwise today's.
openDay(location.hash.slice(1));
