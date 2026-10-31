import assert from "node:assert/strict";
import { test } from "node:test";
import { fuzzyFilter, fuzzyScore } from "../site/js/fuzzy.js";

const UNIVERSITIES = [
  "Universidad de La Habana",
  "Universidad de Oriente - Sede Antonio Maceo",
  "Massachusetts Institute of Technology",
  "Moscow Institute of Physics and Technology",
  "St. Petersburg ITMO University",
  "University of Warsaw",
  "École Normale Supérieure de Paris",
];

const best = (query, items = UNIVERSITIES) => fuzzyFilter(query, items)[0];

test("a substring and a word prefix match", () => {
  assert.equal(best("habana"), "Universidad de La Habana");
  assert.equal(best("hab"), "Universidad de La Habana");
});

test("spelling mistakes still match", () => {
  assert.equal(best("havana"), "Universidad de La Habana");
  assert.equal(best("warsow"), "University of Warsaw");
  assert.equal(best("havna"), "Universidad de La Habana");
  assert.equal(best("massachusets"), "Massachusetts Institute of Technology");
});

test("accents and case do not matter", () => {
  assert.equal(best("ECOLE normale"), "École Normale Supérieure de Paris");
  assert.ok(fuzzyScore("rio", "Pinar del Río") > 0);
});

test("words can come in any order and all must match", () => {
  assert.equal(best("oriente universidad"), "Universidad de Oriente - Sede Antonio Maceo");
  assert.equal(fuzzyFilter("habana warsaw", UNIVERSITIES).length, 0);
});

test("an acronym matches its initials", () => {
  assert.equal(best("mipt"), "Moscow Institute of Physics and Technology");
  assert.equal(best("mit"), "Massachusetts Institute of Technology");
});

test("countries match across Spanish and English spellings", () => {
  assert.equal(best("russia", ["Rusia", "Cuba", "Polonia"]), "Rusia");
  assert.equal(best("brazil", ["Brasil", "Cuba"]), "Brasil");
});

test("years match by prefix, and the exact year goes first", () => {
  const years = ["2019", "2020", "2021"];
  assert.deepEqual(fuzzyFilter("202", years), ["2020", "2021"]);
  assert.equal(best("2021", years), "2021");
});

test("unrelated text does not match", () => {
  assert.equal(fuzzyScore("zzzz", "Universidad de La Habana"), 0);
  assert.equal(fuzzyScore("", "Universidad de La Habana"), 0);
});

test("an exact word ranks above a fuzzy match", () => {
  assert.equal(best("cuba", ["Cuban Institute", "Cuba", "Kuba"]), "Cuba");
});

test("the global search finds people by name, not by profile id", async () => {
  const { searchEntries } = await import("../site/js/search.js");
  const row = { uniName: "Universidad de La Habana" };
  const data = {
    countries: {},
    countriesIndex: new Map(),
    unis: [],
    people: new Map([
      ["icpc:Marcelo Fornet Fornes", { key: "icpc:Marcelo Fornet Fornes", name: "Marcelo Fornet Fornes", rows: [row] }],
      ["topcoder:xyz", { key: "topcoder:xyz", name: "Ana Pérez", rows: [row] }],
    ]),
  };
  const entries = searchEntries(data);
  const find = (query) => fuzzyFilter(query, entries, (e) => e.key).map((e) => e.label);
  assert.deepEqual(find("marcelo"), ["Marcelo Fornet Fornes"]);
  assert.deepEqual(find("fornet"), ["Marcelo Fornet Fornes"]);
  assert.deepEqual(find("ana perez"), ["Ana Pérez"]);
  assert.deepEqual(find("topcoder"), []);
});

test("the profile text states the titles and the finals of a competitor", async () => {
  const { personFacts } = await import("../site/js/profile.js");
  const row = (year, rank, titles) => ({ year, rank, solved: 5, team: "UH++", titles, medal: null, uni: "uh", uniName: "UH", player_ids: ["a", "b"], players: ["Ana", "Luis"] });
  const data = { byId: new Map([["uh", { name: "Universidad de La Habana" }]]), field: { 2015: 128, 2017: 133 } };
  const text = personFacts(data, { key: "a", rows: [row(2015, 108, []), row(2017, 44, ["Latin America"])] }).join(" ");
  assert.match(text, /Título de América Latina<\/b> en 2017/);
  assert.match(text, /en 2015 y 2017/);
  assert.match(text, /puesto 44 de 133 en 2017/);
  assert.match(text, /Luis.* \(2 finales\)/);
});
