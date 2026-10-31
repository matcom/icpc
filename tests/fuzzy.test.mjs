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
