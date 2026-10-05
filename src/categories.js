// Every category is a predicate over one element record from data/elements.json.
// `group` keeps boards varied: the generator allows at most two categories per group.
// `how` is the player-facing explanation shown in the help dialog.

const has = (v) => v !== null && v !== undefined;
const SYMBOLS = new Set("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".toLowerCase().split(" "));
// Can the word be cut into element symbols, Breaking Bad style?
const spellsName = (name, s = name.toLowerCase()) =>
  s === "" || [1, 2].some((n) => s.length >= n && SYMBOLS.has(s.slice(0, n)) && spellsName(name, s.slice(n)));

export const GROUPS = {
  family: { title: "Family", how: "The usual periodic-table families. The superheavy elements from 104 on have no measured properties and belong to no family here." },
  state: { title: "State and properties", how: "Measured values for elements up to 103; temperatures at normal pressure. Elements without a measured value never qualify." },
  number: { title: "Atomic number" },
  discovery: { title: "Discovery", how: "Year and place of discovery as given on Wikipedia. Elements known since antiquity count as discovered before every date." },
  name: { title: "Name and symbol" },
  origin: { title: "What it is named after" },
  world: { title: "Where it is found" },
  use: { title: "What it is used for" },
};

// The small families (alkali, alkaline earth, post-transition, metalloid,
// noble gas, halogen) and the actinides never cross another category in four
// or more elements, so they cannot be on a board.
const CATEGORY_NAMES = {
  "transition metal": "Transition metal",
  lanthanide: "Lanthanide",
};
const METALS = ["alkali metal", "alkaline earth metal", "transition metal", "post-transition metal", "lanthanide", "actinide"];

const family = [
  ...Object.entries(CATEGORY_NAMES).map(([key, label]) => ({
    id: `family:${key}`,
    label,
    group: "family",
    test: (e) => e.category === key,
  })),
  { id: "family:metal", label: "Metal", group: "family", how: "Any metal family: alkali, alkaline earth, transition, post-transition, lanthanide or actinide.", test: (e) => METALS.includes(e.category) },
  { id: "family:nonmetal", label: "Nonmetal", group: "family", how: "Reactive nonmetals and noble gases; metalloids do not count.", test: (e) => /nonmetal|noble gas/.test(e.category) },
];

const state = [
  { id: "phase:gas", label: "Gas at room temperature", group: "state", test: (e) => e.phase === "gas" },
  { id: "melt:oven", label: "Would melt in a kitchen oven", group: "state", how: "A liquid, or a solid melting below 250 °C: mercury and bromine, the alkali metals, gallium, indium, tin, sulfur, selenium and iodine. Gases do not count.", test: (e) => e.phase !== "gas" && has(e.melt) && e.melt < 250 },
  { id: "melt:iron", label: "Harder to melt than iron", group: "state", how: "Melts above 1538 °C, iron's melting point. Carbon turns straight to gas and has no melting point here.", test: (e) => has(e.melt) && e.melt > 1538 },
  { id: "melt:low", label: "Melts below 0 °C", group: "state", test: (e) => has(e.melt) && e.melt < 0 },
  { id: "density:heavy", label: "Density over 10 g/cm³", group: "state", how: "At room temperature.", test: (e) => has(e.density) && e.density > 10 },
  { id: "radioactive", label: "Radioactive", group: "state", how: "No stable isotope: technetium, promethium and everything from polonium (84) on.", test: (e) => e.number >= 84 || e.id === "Tc" || e.id === "Pm" },
];

const number = [
  { id: "z:under20", label: "Atomic number under 20", group: "number", test: (e) => e.number < 20 },
  { id: "z:over80", label: "Atomic number over 80", group: "number", test: (e) => e.number > 80 },
];

const discovery = [
  { id: "disc:antiquity", label: "Known in antiquity", group: "discovery", how: "Known before the year 1000: the metals of the ancients plus carbon and sulfur.", test: (e) => has(e.discovered) && e.discovered < 1000 },
  { id: "disc:1700s", label: "Discovered in the 18th century", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1700 && e.discovered < 1800 },
  { id: "disc:1800to1849", label: "Discovered 1800–1849", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1800 && e.discovered < 1850 },
  { id: "disc:1850to1899", label: "Discovered 1850–1899", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1850 && e.discovered < 1900 },
  { id: "disc:1900s", label: "Discovered in the 20th century", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1900 && e.discovered < 2000 },
  { id: "set:discovered_sweden", label: "Discovered in Sweden", group: "discovery", how: "Finland was Swedish when yttrium was found there.", test: (e) => e.sets.includes("discovered_sweden") },
  { id: "set:discovered_uk", label: "Discovered in Britain", group: "discovery", test: (e) => e.sets.includes("discovered_uk") },
  { id: "set:discovered_germany", label: "Discovered in Germany", group: "discovery", test: (e) => e.sets.includes("discovered_germany") },
  { id: "set:discovered_france", label: "Discovered in France", group: "discovery", test: (e) => e.sets.includes("discovered_france") },
  { id: "set:davy", label: "Isolated by Humphry Davy", group: "discovery", how: "With his electric battery, 1807–1808: sodium, potassium, calcium, magnesium, strontium, barium and boron.", test: (e) => e.sets.includes("davy") },
];

const names = [
  { id: "name:on", label: "Name ends with -on", group: "name", test: (e) => e.name.endsWith("on") },
  { id: "name:ine-gen", label: "Name ends with -ine or -gen", group: "name", test: (e) => /ine$|gen$/.test(e.name) },
  { id: "name:short", label: "Name has 5 letters or fewer", group: "name", test: (e) => e.name.length <= 5 },
  { id: "name:double", label: "Double letter in the name", group: "name", how: "The same letter twice in a row, as in copper or gallium.", test: (e) => /(.)\1/i.test(e.name) },
  { id: "name:spells", label: "Name spells itself in symbols", group: "name", how: "The English name can be written as a row of element symbols: C·Ar·B·O·N, Ir·O·N, Co·P·P·Er.", test: (e) => spellsName(e.name) },
  { id: "symbol:one", label: "One-letter symbol", group: "name", test: (e) => e.id.length === 1 },
  { id: "set:latin_symbol", label: "Symbol from a Latin name", group: "name", how: "The symbol does not come from the English name: Na from natrium, W from wolfram, and so on.", test: (e) => e.sets.includes("latin_symbol") },
];

const origin = [
  { id: "set:named_place", label: "Named after a place", group: "origin", how: "A village, city, region, country or continent.", test: (e) => e.sets.includes("named_place") },
  { id: "set:named_myth", label: "Named after a myth", group: "origin", how: "A god, titan, nymph or goblin.", test: (e) => e.sets.includes("named_myth") },
  { id: "set:named_colour", label: "Named after a colour", group: "origin", how: "Usually the colour of its flame or spectral line, in Greek or Latin.", test: (e) => e.sets.includes("named_colour") },
];

const world = [
  { id: "set:essential", label: "Essential to human life", group: "world", how: "Including trace elements such as selenium and molybdenum.", test: (e) => e.sets.includes("essential") },
  { id: "set:body_top10", label: "Top 10 in the human body", group: "world", how: "By mass: oxygen, carbon, hydrogen, nitrogen, calcium, phosphorus, potassium, sulfur, sodium and chlorine.", test: (e) => e.sets.includes("body_top10") },
  { id: "set:crust_top10", label: "Top 10 in the Earth's crust", group: "world", how: "By mass.", test: (e) => e.sets.includes("crust_top10") },
  { id: "set:sun_top10", label: "Top 10 in the Sun", group: "world", how: "By mass: hydrogen, helium, oxygen, carbon, iron, neon, nitrogen, silicon, magnesium and sulfur.", test: (e) => e.sets.includes("sun_top10") },
];

const use = [
  { id: "set:flame_colour", label: "Colours a flame", group: "use", how: "A clear colour in the flame test, and in fireworks: lithium, sodium, potassium, rubidium, caesium, calcium, strontium, barium, copper, boron, indium and thallium.", test: (e) => e.sets.includes("flame_colour") },
  { id: "set:lamp", label: "Makes light in a lamp", group: "use", how: "The element that glows: neon, argon, krypton, xenon and helium in signs and flash tubes, sodium and mercury vapour lamps, the tungsten filament.", test: (e) => e.sets.includes("lamp") },
];

export const CATEGORIES = [...family, ...state, ...number, ...discovery, ...names, ...origin, ...world, ...use];
