// Every category is a predicate over one element record from data/elements.json.
// `group` keeps boards varied: the generator allows at most two categories per group.
// `how` is the player-facing explanation shown in the help dialog.

const has = (v) => v !== null && v !== undefined;

export const GROUPS = {
  family: { title: "Family", how: "The usual periodic-table families. The superheavy elements from 104 on have no measured properties and belong to no family here." },
  state: { title: "State and properties", how: "Measured values for elements up to 103; temperatures at normal pressure. Elements without a measured value never qualify." },
  number: { title: "Atomic number and mass" },
  discovery: { title: "Discovery", how: "Year and place of discovery as given on Wikipedia. Elements known since antiquity count as discovered before every date." },
  name: { title: "Name and symbol" },
  origin: { title: "What it is named after" },
  world: { title: "In the world" },
};

const CATEGORY_NAMES = {
  "alkali metal": "Alkali metal",
  "alkaline earth metal": "Alkaline earth metal",
  "transition metal": "Transition metal",
  "post-transition metal": "Post-transition metal",
  metalloid: "Metalloid",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
  "noble gas": "Noble gas",
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
  { id: "family:halogen", label: "Halogen", group: "family", how: "Group 17.", test: (e) => e.group === 17 },
];

const state = [
  { id: "phase:gas", label: "Gas at room temperature", group: "state", test: (e) => e.phase === "gas" },
  { id: "phase:liquid", label: "Liquid or melts in your hand", group: "state", how: "Liquid at room temperature, or melting below 40 °C: bromine, mercury, caesium, gallium, rubidium and francium.", test: (e) => has(e.melt) && e.melt < 40 },
  { id: "melt:high", label: "Melts above 2000 °C", group: "state", test: (e) => has(e.melt) && e.melt > 2000 },
  { id: "melt:low", label: "Melts below 0 °C", group: "state", test: (e) => has(e.melt) && e.melt < 0 },
  { id: "boil:low", label: "Boils below 0 °C", group: "state", test: (e) => has(e.boil) && e.boil < 0 },
  { id: "density:heavy", label: "Density over 10 g/cm³", group: "state", how: "At room temperature.", test: (e) => has(e.density) && e.density > 10 },
  { id: "density:light", label: "Lighter than water", group: "state", how: "Density below 1 g/cm³: the gases plus lithium, sodium and potassium.", test: (e) => has(e.density) && e.density < 1 },
  { id: "en:high", label: "Electronegativity over 2.5", group: "state", how: "Pauling scale.", test: (e) => has(e.electronegativity) && e.electronegativity > 2.5 },
  { id: "en:low", label: "Electronegativity under 1", group: "state", how: "Pauling scale.", test: (e) => has(e.electronegativity) && e.electronegativity < 1 },
  { id: "radioactive", label: "Radioactive", group: "state", how: "No stable isotope: technetium, promethium and everything from polonium (84) on.", test: (e) => e.number >= 84 || e.id === "Tc" || e.id === "Pm" },
];

const number = [
  { id: "z:under10", label: "Atomic number under 10", group: "number", test: (e) => e.number < 10 },
  { id: "z:under20", label: "Atomic number under 20", group: "number", test: (e) => e.number < 20 },
  { id: "z:over80", label: "Atomic number over 80", group: "number", test: (e) => e.number > 80 },
  { id: "z:over100", label: "Atomic number over 100", group: "number", test: (e) => e.number > 100 },
  { id: "z:even", label: "Even atomic number", group: "number", test: (e) => e.number % 2 === 0 },
  { id: "z:odd", label: "Odd atomic number", group: "number", test: (e) => e.number % 2 === 1 },
  { id: "mass:over200", label: "Atomic mass over 200", group: "number", test: (e) => e.mass > 200 },
  { id: "mass:under30", label: "Atomic mass under 30", group: "number", test: (e) => e.mass < 30 },
];

const discovery = [
  { id: "disc:antiquity", label: "Known in antiquity", group: "discovery", how: "Known before the year 1000: the metals of the ancients plus carbon and sulfur.", test: (e) => has(e.discovered) && e.discovered < 1000 },
  { id: "disc:before1800", label: "Discovered before 1800", group: "discovery", test: (e) => has(e.discovered) && e.discovered < 1800 },
  { id: "disc:1800s", label: "Discovered in the 19th century", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1800 && e.discovered < 1900 },
  { id: "disc:1900s", label: "Discovered in the 20th century", group: "discovery", test: (e) => has(e.discovered) && e.discovered >= 1900 && e.discovered < 2000 },
  { id: "disc:after1945", label: "Discovered after 1945", group: "discovery", test: (e) => has(e.discovered) && e.discovered > 1945 },
  { id: "set:synthetic", label: "First made in a lab", group: "discovery", how: "Not found in nature in any useful amount: technetium, promethium and everything from neptunium (93) on.", test: (e) => e.sets.includes("synthetic") },
  { id: "set:discovered_sweden", label: "Discovered in Sweden", group: "discovery", how: "Finland was Swedish when yttrium was found there.", test: (e) => e.sets.includes("discovered_sweden") },
  { id: "set:discovered_uk", label: "Discovered in Britain", group: "discovery", test: (e) => e.sets.includes("discovered_uk") },
  { id: "set:discovered_germany", label: "Discovered in Germany", group: "discovery", test: (e) => e.sets.includes("discovered_germany") },
  { id: "set:discovered_france", label: "Discovered in France", group: "discovery", test: (e) => e.sets.includes("discovered_france") },
  { id: "set:discovered_usa", label: "Discovered in the USA", group: "discovery", test: (e) => e.sets.includes("discovered_usa") },
  { id: "set:discovered_russia", label: "Discovered in Russia", group: "discovery", how: "Including the Soviet Union and the joint discoveries at Dubna.", test: (e) => e.sets.includes("discovered_russia") },
  { id: "set:discovered_woman", label: "Discovered by a woman", group: "discovery", how: "Discovered or co-discovered by a woman.", test: (e) => e.sets.includes("discovered_woman") },
];

const names = [
  ...["A", "B", "C", "N", "P", "R", "S", "T"].map((l) => ({ id: `name:${l}`, label: `Name starts with ${l}`, group: "name", test: (e) => e.name.startsWith(l) })),
  { id: "name:ium", label: "Name ends with -ium", group: "name", test: (e) => e.name.endsWith("ium") },
  { id: "name:on", label: "Name ends with -on", group: "name", test: (e) => e.name.endsWith("on") },
  { id: "name:ine-gen", label: "Name ends with -ine or -gen", group: "name", test: (e) => /ine$|gen$/.test(e.name) },
  { id: "name:short", label: "Name has 5 letters or fewer", group: "name", test: (e) => e.name.length <= 5 },
  { id: "name:long", label: "Name has 10 letters or more", group: "name", test: (e) => e.name.length >= 10 },
  { id: "name:y", label: "Name contains a Y", group: "name", test: (e) => /y/i.test(e.name) },
  { id: "symbol:one", label: "One-letter symbol", group: "name", test: (e) => e.id.length === 1 },
  { id: "set:latin_symbol", label: "Symbol from a Latin name", group: "name", how: "The symbol does not come from the English name: Na from natrium, W from wolfram, and so on.", test: (e) => e.sets.includes("latin_symbol") },
  { id: "symbol:vowel", label: "Symbol starts with a vowel", group: "name", test: (e) => /^[AEIOU]/.test(e.id) },
];

const origin = [
  { id: "set:named_person", label: "Named after a person", group: "origin", test: (e) => e.sets.includes("named_person") },
  { id: "set:named_place", label: "Named after a place", group: "origin", how: "A village, city, region, country or continent.", test: (e) => e.sets.includes("named_place") },
  { id: "set:named_celestial", label: "Named after a planet or other heavenly body", group: "origin", how: "The Sun, the Moon, the Earth, a planet or an asteroid.", test: (e) => e.sets.includes("named_celestial") },
  { id: "set:named_myth", label: "Named after a myth", group: "origin", how: "A god, titan, nymph or goblin.", test: (e) => e.sets.includes("named_myth") },
  { id: "set:named_colour", label: "Named after a colour", group: "origin", how: "Usually the colour of its flame or spectral line, in Greek or Latin.", test: (e) => e.sets.includes("named_colour") },
];

const world = [
  { id: "set:essential", label: "Essential to human life", group: "world", how: "Including trace elements such as selenium and molybdenum.", test: (e) => e.sets.includes("essential") },
  { id: "set:precious", label: "Precious metal", group: "world", how: "Gold, silver and the six platinum-group metals.", test: (e) => e.sets.includes("precious") },
  { id: "set:crust_top10", label: "Top 10 in the Earth's crust", group: "world", how: "By mass.", test: (e) => e.sets.includes("crust_top10") },
  { id: "set:air", label: "In the air", group: "world", how: "A gas in dry air, not counting carbon dioxide.", test: (e) => e.sets.includes("air") },
];

export const CATEGORIES = [...family, ...state, ...number, ...discovery, ...names, ...origin, ...world];
