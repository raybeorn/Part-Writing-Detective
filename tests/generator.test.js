// Stress test: each generated measure must break only its target rule, one time.
// Run with: node tests/generator.test.js
const PW = require('../js/theory.js');

let failures = 0;
const RUNS = 60;
const t0 = Date.now();

for (const mode of ['major', 'minor']) {
  for (const id of PW.availableRules(mode)) {
    let made = 0;
    for (let i = 0; i < RUNS; i++) {
      const m = PW.generateMeasure(id, mode);
      if (!m) continue;
      made++;
      const v = PW.checkMeasure(m);
      if (v.length !== 1 || v[0].rule !== id) {
        failures++;
        console.log(`FAIL rule ${id} ${mode}:`, v.map((x) => x.rule));
      }
    }
    if (made < RUNS) {
      failures++;
      console.log(`FAIL rule ${id} ${mode}: generated only ${made}/${RUNS}`);
    }
  }
}

// Displayed rule numbers are 1 to 11 in list order, grouped by category. Each id is unique.
const nums = PW.RULES.map((r) => r.num).join(',');
const cats = PW.RULES.map((r) => r.category);
const ids = new Set(PW.RULES.map((r) => r.id));
if (nums !== '1,2,3,4,5,6,7,8,9,10,11' || cats.some((c, i) => i && c < cats[i - 1]) || ids.size !== 11) {
  failures++;
  console.log('FAIL rule numbering/categories:', nums, cats.join(','));
}

// Exercises always have the requested number of measures.
for (const mode of ['major', 'minor', 'both']) {
  const ex = PW.generateExercise(11, mode, PW.availableRules(mode));
  if (ex.length !== 11) { failures++; console.log(`FAIL ${mode} exercise has ${ex.length}/11 measures`); }
}

// Correct hand-written progressions must have no violations.
const C = PW.makeKey('major', PW.KEYS.major[0]);
const n = (chord, specs) => specs.map(([deg, oct]) => {
  const m = chord.members.find((x) => x.deg === deg);
  return { letter: m.letter, alter: m.alter, oct, step: oct * 7 + m.letter,
    midi: 12 * (oct + 1) + [0, 2, 4, 5, 7, 9, 11][m.letter] + m.alter, deg, role: m.role };
});
const V7 = PW.buildChord(C, 'V7'), I = PW.buildChord(C, 'I');
const good = { key: C, chords: [V7, I], voicings: [
  n(V7, [[3, 5], [6, 4], [1, 4], [4, 2]]), // F5 B4 D4 G2
  n(I, [[2, 5], [0, 5], [0, 4], [0, 3]]),  // E5 C5 C4 C3
] };
const gv = PW.checkMeasure(good);
if (gv.length) { failures++; console.log('FAIL clean V7-I flagged:', gv.map((x) => x.msg)); }

// Parallel octaves C4-C3 -> F4-F3 (tenor and bass) must be caught.
const IV = PW.buildChord(C, 'IV');
const par = { key: C, chords: [I, IV], voicings: [
  n(I, [[4, 4], [2, 4], [0, 4], [0, 3]]),  // G4 E4 C4 C3
  n(IV, [[0, 5], [5, 4], [3, 4], [3, 3]]), // C5 A4 F4 F3
] };
const pv = PW.checkMeasure(par).map((x) => x.rule);
if (!pv.includes(2)) { failures++; console.log('FAIL parallel not caught:', pv); }

// Hidden fifths: soprano leaps A4→D5 while the bass steps F3→G3 into a 12th (rule 3).
const V = PW.buildChord(C, 'V');
const hidden5 = { key: C, chords: [IV, V], voicings: [
  n(IV, [[5, 4], [3, 4], [0, 4], [3, 3]]), // A4 F4 C4 F3
  n(V, [[1, 5], [1, 4], [6, 3], [4, 3]]),  // D5 D4 B3 G3
] };
const hv = PW.checkMeasure(hidden5).map((x) => x.rule);
if (!hv.includes(3)) { failures++; console.log('FAIL hidden fifths not caught:', hv); }

// The same arrival with a stepwise soprano (C5→D5) is correct.
hidden5.voicings[0][0] = n(IV, [[0, 5]])[0];
const sv = PW.checkMeasure(hidden5).map((x) => x.rule);
if (sv.includes(3)) { failures++; console.log('FAIL stepwise soprano flagged as hidden fifths'); }

console.log(failures ? `${failures} failure(s)` : 'All generator checks passed', `(${Date.now() - t0} ms)`);
process.exit(failures ? 1 : 0);
