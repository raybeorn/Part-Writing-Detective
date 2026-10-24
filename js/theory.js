/*
 * Part-writing engine.
 * It builds chords in a key. Minor keys use harmonic minor for V, V7, and vii°.
 * It checks a two-chord SATB measure against the 11 rules.
 * It generates measures that break one selected rule.
 * It sets window.PartWriting in a browser and module.exports in Node (for the tests).
 */
(function (global) {
  'use strict';

  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NAT_PC = [0, 2, 4, 5, 7, 9, 11];
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  const VOICES = ['soprano', 'alto', 'tenor', 'bass'];
  // MIDI ranges [low, high] for S, A, T, B.
  const RANGES = [[62, 79], [55, 72], [48, 67], [40, 60]];

  const KEYS = {
    major: [
      { name: 'C', letter: 0, alter: 0, sig: 0 },
      { name: 'G', letter: 4, alter: 0, sig: 1 },
      { name: 'D', letter: 1, alter: 0, sig: 2 },
      { name: 'A', letter: 5, alter: 0, sig: 3 },
      { name: 'F', letter: 3, alter: 0, sig: -1 },
      { name: 'B♭', letter: 6, alter: -1, sig: -2 },
      { name: 'E♭', letter: 2, alter: -1, sig: -3 },
    ],
    minor: [
      { name: 'A', letter: 5, alter: 0, sig: 0 },
      { name: 'E', letter: 2, alter: 0, sig: 1 },
      { name: 'B', letter: 6, alter: 0, sig: 2 },
      { name: 'D', letter: 1, alter: 0, sig: -1 },
      { name: 'G', letter: 4, alter: 0, sig: -2 },
      { name: 'C', letter: 0, alter: 0, sig: -3 },
    ],
  };

  const CATEGORIES = ['Objectionable parallelism', 'Errors of melodic function', 'Errors of doubling'];

  // Rules in display order. `num` is the number that the user sees.
  // `id` is the internal key for the checker, the generator, and saved progress. Do not change it.
  const RULES = [
    { id: 2, num: 1, category: 0, short: 'Parallel / contrary 5ths, 8ves, unisons', text: 'Parallel unisons, fifths, and octaves are forbidden. Octaves and fifths by contrary motion are forbidden.' },
    { id: 3, num: 2, category: 0, short: 'Forbidden hidden 8ves / 5ths (outer voices)', text: 'Hidden octaves are unavoidable in the inner voices and generally acceptable in the outer voices. Exceptions: V6 → I with 5̂→1̂ in the soprano and 7̂→1̂ in the bass, and V7 → I6 with 4̂→3̂ in the soprano. Hidden fifths in the outer voices are forbidden when the soprano leaps (a stepwise soprano is fine).' },
    { id: 9, num: 3, category: 0, short: 'd5 → P5', text: 'P5 → d5 is acceptable. d5 → P5 is avoided because the dissonant interval does not resolve.' },
    { id: 4, num: 4, category: 1, short: 'Voice overlap / crossing', text: 'Avoid voice overlap and voice crossing. Overlap: a lower voice moves above the previous note of the voice above it (or an upper voice moves below the previous note of the voice below it). Crossing: two voices exchange position.' },
    { id: 5, num: 5, category: 1, short: 'V7 → I resolution', text: 'In V7 → I, 4̂ must resolve to 3̂, and 7̂ must resolve to 1̂ in the soprano. 7̂ may resolve to 5̂ in the inner voices.' },
    { id: 7, num: 6, category: 1, short: 'Unraised leading tone (minor)', text: 'Always raise the leading tone in minor.' },
    { id: 8, num: 7, category: 1, short: 'Melodic augmented 2nd', text: 'Melodic augmented 2nds are never allowed.' },
    { id: 10, num: 8, category: 1, short: 'Spacing over an octave', text: 'Keep adjacent upper voices (soprano–alto, alto–tenor) within an octave.' },
    { id: 1, num: 9, category: 2, short: 'Doubled leading tone', text: 'Do not double the leading tone.' },
    { id: 6, num: 10, category: 2, short: 'Doubled 4̂ in V7', text: 'Never double 4̂ in a V7: both must resolve to 3̂, which creates parallel octaves.' },
    { id: 11, num: 11, category: 2, short: 'Illegal incomplete chord', text: 'Only root-position I and V may be incomplete, and only by omitting the fifth. Never omit the third or the root.' },
  ];
  const ruleById = (id) => RULES.find((r) => r.id === Number(id));

  // Chord labels use major-key names. Minor keys change the labels.
  const CHORDS = {
    'I': { root: 0, inv: 0 },
    'I6': { root: 0, inv: 1 },
    'ii6': { root: 1, inv: 1 },
    'IV': { root: 3, inv: 0 },
    'IV6': { root: 3, inv: 1 },
    'V': { root: 4, inv: 0 },
    'V6': { root: 4, inv: 1 },
    'V7': { root: 4, inv: 0, seventh: true },
    'vi': { root: 5, inv: 0 },
    'vii°6': { root: 6, inv: 1 },
  };
  const MINOR_LABEL = { 'I': 'i', 'I6': 'i6', 'ii6': 'ii°6', 'IV': 'iv', 'IV6': 'iv6', 'vi': 'VI' };

  // Progressions for each rule id. Each measure uses one progression.
  const COMMON = [['I', 'IV'], ['I', 'V'], ['IV', 'V'], ['V', 'I'], ['V', 'vi'], ['vi', 'IV'], ['ii6', 'V'], ['IV', 'I'], ['I', 'vi'], ['I6', 'IV']];
  const PROGRESSIONS = {
    1: [['I', 'V'], ['IV', 'V'], ['V', 'I'], ['V', 'vi'], ['ii6', 'V'], ['V', 'I6']],
    2: COMMON,
    // The octave patterns are in the list two times, so they occur as often as hidden fifths.
    3: [['V6', 'I'], ['V7', 'I6'], ['V6', 'I'], ['V7', 'I6'], ['I', 'IV'], ['I', 'V'], ['IV', 'V'], ['ii6', 'V']],
    4: COMMON,
    5: [['V7', 'I']],
    6: [['V7', 'I']],
    7: [['I', 'V'], ['IV', 'V'], ['V', 'I'], ['V', 'vi'], ['ii6', 'V']],
    8: [['IV', 'V'], ['vi', 'V'], ['ii6', 'V'], ['IV6', 'V'], ['V', 'vi']],
    9: [['vii°6', 'I'], ['vii°6', 'I6']],
    10: COMMON,
    11: [['I', 'IV'], ['I', 'V'], ['IV', 'V'], ['V', 'I'], ['I6', 'IV'], ['ii6', 'V'], ['IV', 'I'], ['I', 'I6'], ['V', 'I6']],
  };
  const MINOR_ONLY = { 7: true, 8: true };

  // ---------- helpers ----------

  const mod = (n, m) => ((n % m) + m) % m;
  const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

  function makeKey(mode, k) {
    return Object.assign({ mode, tonicPC: mod(NAT_PC[k.letter] + k.alter, 12) }, k);
  }

  function keyName(key) {
    return key.name + (key.mode === 'major' ? ' major' : ' minor');
  }

  function accidentalSymbol(alter) {
    return { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' }[alter];
  }

  function noteName(n, withOctave) {
    return LETTERS[n.letter] + accidentalSymbol(n.alter) + (withOctave ? n.oct : '');
  }

  function degreeName(deg) {
    return (deg + 1) + '̂';
  }

  function spellDegree(key, deg, raised) {
    const letter = (key.letter + deg) % 7;
    const pc = mod(key.tonicPC + SCALE[key.mode][deg] + (raised ? 1 : 0), 12);
    let alter = mod(pc - NAT_PC[letter], 12);
    if (alter > 6) alter -= 12;
    return { letter, alter, pc };
  }

  function chordLabel(key, label) {
    return key.mode === 'minor' && MINOR_LABEL[label] ? MINOR_LABEL[label] : label;
  }

  function buildChord(key, label, opts) {
    const def = CHORDS[label];
    const dominant = def.root === 4 || def.root === 6;
    const roles = ['root', 'third', 'fifth'].concat(def.seventh ? ['seventh'] : []);
    const members = roles.map((role, i) => {
      const deg = (def.root + 2 * i) % 7;
      const raised = key.mode === 'minor' && dominant && deg === 6 && !(opts && opts.unraised);
      return Object.assign({ role, deg }, spellDegree(key, deg, raised));
    });
    return {
      label,
      display: chordLabel(key, label),
      root: def.root,
      inv: def.inv,
      seventh: !!def.seventh,
      dominant,
      bassRole: ['root', 'third', 'fifth'][def.inv],
      members,
    };
  }

  function makeNote(member, oct) {
    return {
      letter: member.letter,
      alter: member.alter,
      oct,
      step: oct * 7 + member.letter,
      midi: 12 * (oct + 1) + NAT_PC[member.letter] + member.alter,
      deg: member.deg,
      role: member.role,
    };
  }

  function notesInRange(chord, range, role) {
    const out = [];
    chord.members.forEach((m) => {
      if (role && m.role !== role) return;
      for (let oct = 1; oct <= 6; oct++) {
        const n = makeNote(m, oct);
        if (n.midi >= range[0] && n.midi <= range[1]) out.push(n);
      }
    });
    return out;
  }

  function roleCounts(v) {
    const c = { root: 0, third: 0, fifth: 0, seventh: 0 };
    v.forEach((n) => c[n.role]++);
    return c;
  }

  // Harmonic interval of two notes: diatonic size (0 is a unison) and semitones.
  function harm(x, y) {
    const hi = x.midi >= y.midi ? x : y;
    const lo = hi === x ? y : x;
    return { d: hi.step - lo.step, s: hi.midi - lo.midi };
  }
  const isP5 = (h) => mod(h.d, 7) === 4 && mod(h.s, 12) === 7;
  const isD5 = (h) => mod(h.d, 7) === 4 && mod(h.s, 12) === 6;
  const isP8 = (h) => mod(h.d, 7) === 0 && mod(h.s, 12) === 0;

  // Semitones of major, minor, and perfect intervals, by diatonic size (mod 7).
  const STANDARD_SEMIS = [[0], [1, 2], [3, 4], [5], [7], [8, 9], [10, 11]];
  function isStandardInterval(d, s) {
    return STANDARD_SEMIS[mod(Math.abs(d), 7)].includes(mod(Math.abs(s), 12));
  }
  const isAug2 = (d, s) => Math.abs(d) === 1 && Math.abs(s) === 3;

  // ---------- rule checker ----------

  const fmt = (n) => noteName(n, true);

  function chordViolations(key, chord, v, ci) {
    const out = [];
    const where = `chord ${ci + 1} (${chord.display})`;
    const counts = roleCounts(v);

    // Rule id 1: doubled leading tone in a dominant-function chord.
    if (chord.dominant) {
      const lt = [0, 1, 2, 3].filter((i) => v[i].deg === 6);
      if (lt.length > 1) {
        out.push({
          rule: 1, notes: lt.map((i) => [ci, i]),
          msg: `The leading tone (${noteName(v[lt[0]])}) is doubled in ${where}, in the ${lt.map((i) => VOICES[i]).join(' and ')}.`,
        });
      }
    }

    // Rule id 6: doubled 4̂ (chordal seventh) in V7.
    if (chord.seventh && chord.root === 4) {
      const f = [0, 1, 2, 3].filter((i) => v[i].deg === 3);
      if (f.length > 1) {
        out.push({
          rule: 6, notes: f.map((i) => [ci, i]),
          msg: `4̂ (${noteName(v[f[0]])}) is doubled in the V7, in the ${f.map((i) => VOICES[i]).join(' and ')}. Both must resolve down to 3̂, which produces parallel octaves.`,
        });
      }
    }

    // Rule id 7: leading tone not raised in minor.
    if (key.mode === 'minor' && chord.dominant) {
      const raisedPC = mod(key.tonicPC + 11, 12);
      const bad = [0, 1, 2, 3].filter((i) => v[i].deg === 6 && mod(v[i].midi, 12) !== raisedPC);
      if (bad.length) {
        const fixed = spellDegree(key, 6, true);
        out.push({
          rule: 7, notes: bad.map((i) => [ci, i]),
          msg: `In minor the leading tone must be raised: ${where} uses ${noteName(v[bad[0]])} instead of ${noteName(fixed)}.`,
        });
      }
    }

    // Rule id 4: voice crossing in one chord.
    for (let i = 0; i < 3; i++) {
      if (v[i].midi < v[i + 1].midi) {
        out.push({
          rule: 4, notes: [[ci, i], [ci, i + 1]],
          msg: `Voice crossing in ${where}: the ${VOICES[i + 1]} (${fmt(v[i + 1])}) is above the ${VOICES[i]} (${fmt(v[i])}).`,
        });
      }
    }

    // Rule id 10: more than an octave between adjacent upper voices.
    for (let i = 0; i < 2; i++) {
      if (v[i].midi - v[i + 1].midi > 12) {
        out.push({
          rule: 10, notes: [[ci, i], [ci, i + 1]],
          msg: `More than an octave between the ${VOICES[i]} (${fmt(v[i])}) and ${VOICES[i + 1]} (${fmt(v[i + 1])}) in ${where}.`,
        });
      }
    }

    // Rule id 11: incomplete chords.
    const fifthOmitOK = chord.inv === 0 && (chord.root === 0 || chord.root === 4);
    const missing = [];
    if (counts.root === 0) missing.push('root');
    if (counts.third === 0) missing.push('third');
    if (chord.seventh && counts.seventh === 0) missing.push('seventh');
    if (counts.fifth === 0 && !fifthOmitOK) missing.push('fifth');
    missing.forEach((role) => {
      const m = chord.members.find((x) => x.role === role);
      const why = role === 'fifth'
        ? ' Only root-position I and V may omit the fifth.'
        : ' The root and third may never be omitted.';
      out.push({
        rule: 11, notes: [0, 1, 2, 3].map((i) => [ci, i]),
        msg: `${where[0].toUpperCase() + where.slice(1)} is missing its ${role} (${noteName(m)}).${why}`,
      });
    });

    return out;
  }

  function motionViolations(key, chords, a, b) {
    const out = [];
    const [c1, c2] = chords;
    const moves = [0, 1, 2, 3].map((i) => b[i].midi - a[i].midi);
    const doubled4 = c1.seventh && c1.root === 4 && a.filter((n) => n.deg === 3).length > 1;

    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const h1 = harm(a[i], a[j]);
        const h2 = harm(b[i], b[j]);
        const both = moves[i] !== 0 && moves[j] !== 0;
        const pair = `the ${VOICES[i]} and ${VOICES[j]}`;
        const motion = `${fmt(a[i])}→${fmt(b[i])} over ${fmt(a[j])}→${fmt(b[j])}`;
        const notes = [[0, i], [0, j], [1, i], [1, j]];

        // Rule id 2: parallel or contrary perfect intervals.
        if (both && ((isP5(h1) && isP5(h2)) || (isP8(h1) && isP8(h2)))) {
          // A doubled 4̂ that resolves to 3̂ counts as rule id 6, not rule id 2.
          const fromDoubled4 = doubled4 && a[i].deg === 3 && a[j].deg === 3;
          if (!fromDoubled4) {
            const contrary = Math.sign(moves[i]) !== Math.sign(moves[j]);
            const kind = isP5(h1) ? 'fifths' : (h1.s === 0 && h2.s === 0 ? 'unisons' : 'octaves');
            out.push({
              rule: 2, notes,
              msg: contrary
                ? `${kind[0].toUpperCase() + kind.slice(1)} by contrary motion between ${pair}: ${motion}.`
                : `Parallel ${kind} between ${pair}: ${motion}.`,
            });
          }
        }

        // Rule id 9: d5 → P5.
        if ((moves[i] !== 0 || moves[j] !== 0) && isD5(h1) && isP5(h2)) {
          out.push({
            rule: 9, notes,
            msg: `A diminished 5th moves to a perfect 5th between ${pair} (${noteName(a[i])}–${noteName(a[j])} → ${noteName(b[i])}–${noteName(b[j])}). The d5 never resolves.`,
          });
        }
      }
    }

    // Rule id 4: voice overlap between adjacent voices.
    for (let i = 0; i < 3; i++) {
      const up = i, lo = i + 1;
      if (b[lo].midi > a[up].midi) {
        out.push({
          rule: 4, notes: [[0, up], [1, lo]],
          msg: `Voice overlap: the ${VOICES[lo]} moves to ${fmt(b[lo])}, above the ${VOICES[up]}'s previous note ${fmt(a[up])}.`,
        });
      } else if (b[up].midi < a[lo].midi) {
        out.push({
          rule: 4, notes: [[0, lo], [1, up]],
          msg: `Voice overlap: the ${VOICES[up]} moves to ${fmt(b[up])}, below the ${VOICES[lo]}'s previous note ${fmt(a[lo])}.`,
        });
      }
    }

    // Rule id 8: melodic augmented 2nd.
    for (let i = 0; i < 4; i++) {
      if (isAug2(b[i].step - a[i].step, moves[i])) {
        out.push({
          rule: 8, notes: [[0, i], [1, i]],
          msg: `Melodic augmented 2nd in the ${VOICES[i]}: ${fmt(a[i])}→${fmt(b[i])}.`,
        });
      }
    }

    // Rule id 3: the two forbidden hidden octaves in the outer voices.
    const sMove = moves[0], bMove = moves[3];
    const similar = sMove !== 0 && Math.sign(sMove) === Math.sign(bMove);
    if (similar && isP8(harm(b[0], b[3])) && !isP8(harm(a[0], a[3]))) {
      const toI = c2.root === 0;
      const patV6 = c1.label === 'V6' && toI && c2.inv === 0 &&
        a[0].deg === 4 && b[0].deg === 0 && a[3].deg === 6 && b[3].deg === 0;
      const patV7 = c1.label === 'V7' && toI && c2.inv === 1 &&
        a[0].deg === 3 && b[0].deg === 2;
      if (patV6 || patV7) {
        out.push({
          rule: 3, notes: [[0, 0], [0, 3], [1, 0], [1, 3]],
          msg: patV6
            ? `Hidden octaves in the outer voices: in ${c1.display} → ${c2.display} the soprano leaps 5̂→1̂ while the bass moves 7̂→1̂ in similar motion (${fmt(a[0])}→${fmt(b[0])} over ${fmt(a[3])}→${fmt(b[3])}).`
            : `Hidden octaves in the outer voices: in ${c1.display} → ${c2.display} the soprano moves 4̂→3̂ while the bass moves to 3̂ in similar motion (${fmt(a[0])}→${fmt(b[0])} over ${fmt(a[3])}→${fmt(b[3])}).`,
        });
      }
    }

    // Rule id 3: hidden fifths in the outer voices when the soprano leaps.
    const sLeap = Math.abs(b[0].step - a[0].step) > 1;
    if (similar && sLeap && isP5(harm(b[0], b[3])) && !isP5(harm(a[0], a[3]))) {
      out.push({
        rule: 3, notes: [[0, 0], [0, 3], [1, 0], [1, 3]],
        msg: `Hidden fifths in the outer voices: the soprano leaps into a perfect 5th with the bass in similar motion (${fmt(a[0])}→${fmt(b[0])} over ${fmt(a[3])}→${fmt(b[3])}).`,
      });
    }

    // Rule id 5: V7 → I resolution.
    if (c1.seventh && c1.root === 4 && c2.root === 0) {
      for (let i = 0; i < 4; i++) {
        const d = b[i].step - a[i].step;
        if (a[i].deg === 3 && !(b[i].deg === 2 && d === -1)) {
          out.push({
            rule: 5, notes: [[0, i], [1, i]],
            msg: `In ${c1.display} → ${c2.display}, 4̂ (${fmt(a[i])}) in the ${VOICES[i]} must resolve down to 3̂, but it moves to ${fmt(b[i])}.`,
          });
        }
        if (a[i].deg === 6) {
          const toTonic = b[i].deg === 0 && d === 1;
          const inner = i === 1 || i === 2;
          const toFifth = b[i].deg === 4 && d === -2;
          if (!toTonic && !(inner && toFifth)) {
            out.push({
              rule: 5, notes: [[0, i], [1, i]],
              msg: inner
                ? `In ${c1.display} → ${c2.display}, 7̂ (${fmt(a[i])}) in the ${VOICES[i]} must go up to 1̂ (or down to 5̂ in an inner voice), but it moves to ${fmt(b[i])}.`
                : `In ${c1.display} → ${c2.display}, 7̂ (${fmt(a[i])}) in the ${VOICES[i]} must resolve up to 1̂, but it moves to ${fmt(b[i])}.`,
            });
          }
        }
      }
    }

    return out;
  }

  function checkMeasure(m) {
    return chordViolations(m.key, m.chords[0], m.voicings[0], 0)
      .concat(chordViolations(m.key, m.chords[1], m.voicings[1], 1))
      .concat(motionViolations(m.key, m.chords, m.voicings[0], m.voicings[1]));
  }

  // ---------- generator ----------

  // Conventional doubling, with the exceptions that each target rule needs.
  function voicingAllowed(chord, v, rule) {
    const c = roleCounts(v);
    if (c.root === 0) return false;
    if (chord.seventh && c.seventh === 0) return false;
    if (c.third === 0 && c.fifth === 0) return false;
    const fifthOmitOK = chord.inv === 0 && (chord.root === 0 || chord.root === 4);
    if (c.third === 0 && rule !== 11) return false;
    if (c.fifth === 0 && !fifthOmitOK && rule !== 11) return false;

    const ltRole = chord.root === 4 ? 'third' : chord.root === 6 ? 'root' : null;
    if (ltRole && c[ltRole] > 1) return rule === 1 && c[ltRole] === 2;
    if (c.seventh > 1) return rule === 6 && c.seventh === 2 && c.root === 1 && c.third === 1;
    if (rule === 11 && (c.third === 0 || (c.fifth === 0 && !fifthOmitOK))) return true;

    if (chord.seventh) return c.fifth === 0 ? c.root === 2 : true;
    if (chord.root === 6) return c.third === 2 || c.fifth === 2;
    // A doubled 4̂ that resolves correctly gives I with a doubled root and a doubled third.
    if (chord.inv === 0) return c.fifth === 0 ? c.root === 3 || (rule === 6 && c.root === 2) : c.root === 2;
    return true;
  }

  function enumerateVoicings(chord, rule) {
    const basses = notesInRange(chord, RANGES[3], chord.bassRole);
    const pools = [0, 1, 2].map((i) => notesInRange(chord, RANGES[i]));
    const out = [];
    basses.forEach((B) => pools[2].forEach((T) => pools[1].forEach((A) => pools[0].forEach((S) => {
      const v = [S, A, T, B];
      if (T.midi < B.midi || T.midi - B.midi > 24) return;
      let crossings = 0;
      for (let i = 0; i < 2; i++) {
        const gap = v[i].midi - v[i + 1].midi;
        if (gap < 0) {
          if (rule !== 4 || gap < -5) return;
          crossings++;
        }
        if (gap > 12 && rule !== 10) return;
        if (gap > 19) return;
      }
      if (crossings > 1) return;
      if ((S.midi === A.midi && A.midi === T.midi) || (A.midi === T.midi && T.midi === B.midi)) return;
      if (voicingAllowed(chord, v, rule)) out.push(v);
    }))));
    return out;
  }

  // Melodic limits that are not part of the 11 rules. They keep the examples idiomatic.
  // Returns -1 to reject the pair, or a cost (lower is smoother).
  function motionCost(a, b, allowHidden8ve) {
    let cost = 0;
    for (let i = 0; i < 4; i++) {
      const d = b[i].step - a[i].step;
      const s = b[i].midi - a[i].midi;
      if (!isAug2(d, s) && !isStandardInterval(d, s)) return -1;
      if (i < 3) {
        if (Math.abs(d) > 4) return -1;
        cost += Math.abs(s) + (Math.abs(d) > 2 ? 3 : 0);
      } else {
        if (Math.abs(d) > 7 || mod(Math.abs(d), 7) === 6) return -1;
        cost += Math.abs(s) * 0.3;
      }
    }
    // Reject hidden 8ves in the outer voices with a soprano leap, because they look like errors.
    // The exception is the V6 → I pattern that rule id 3 flags. Rule id 3 also checks hidden 5ths.
    if (!allowHidden8ve) {
      const sm = b[0].midi - a[0].midi, bm = b[3].midi - a[3].midi;
      if (sm !== 0 && Math.sign(sm) === Math.sign(bm) && Math.abs(b[0].step - a[0].step) > 1 &&
          isP8(harm(b[0], b[3]))) return -1;
    }
    return cost;
  }

  function generateMeasure(rule, mode, rnd) {
    rnd = rnd || Math.random;
    for (let attempt = 0; attempt < 40; attempt++) {
      const m = MINOR_ONLY[rule] ? 'minor' : (mode === 'both' ? (rnd() < 0.5 ? 'major' : 'minor') : mode);
      const key = makeKey(m, pick(KEYS[m], rnd));
      const prog = pick(PROGRESSIONS[rule], rnd);
      const chords = prog.map((label) =>
        buildChord(key, label, { unraised: rule === 7 && CHORDS[label].root === 4 }));
      const v1 = enumerateVoicings(chords[0], rule);
      const v2 = enumerateVoicings(chords[1], rule);
      const cands = [];
      for (const a of v1) {
        for (const b of v2) {
          const cost = motionCost(a, b, rule === 3 && prog[0] === 'V6');
          if (cost < 0) continue;
          const viol = checkMeasure({ key, chords, voicings: [a, b] });
          if (viol.length === 1 && viol[0].rule === rule) cands.push({ a, b, cost, viol: viol[0] });
        }
      }
      if (!cands.length) continue;
      cands.sort((x, y) => x.cost - y.cost);
      const best = cands.slice(0, Math.max(6, Math.ceil(cands.length * 0.15)));
      const c = pick(best, rnd);
      return { rule, key, chords, voicings: [c.a, c.b], violation: c.viol };
    }
    return null;
  }

  function availableRules(mode) {
    return RULES.map((r) => r.id).filter((id) => mode !== 'major' || !MINOR_ONLY[id]);
  }

  function generateExercise(count, mode, rules, rnd) {
    rnd = rnd || Math.random;
    const pool = rules.filter((id) => mode !== 'major' || !MINOR_ONLY[id]);
    if (!pool.length) return [];
    const order = [];
    while (order.length < count) {
      const bag = pool.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      order.push(...bag);
    }
    // If a rule fails to generate, try the other rules. The exercise then always has `count` measures.
    return order.slice(0, count).map((id) => {
      const tries = [id].concat(pool.filter((other) => other !== id));
      for (const rule of tries) {
        const m = generateMeasure(rule, mode, rnd);
        if (m) return m;
      }
      return null;
    }).filter(Boolean);
  }

  const api = {
    LETTERS, VOICES, RULES, CATEGORIES, ruleById, KEYS, MINOR_ONLY, PROGRESSIONS,
    makeKey, keyName, noteName, degreeName, accidentalSymbol, spellDegree,
    buildChord, checkMeasure, generateMeasure, generateExercise, availableRules,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.PartWriting = api;
})(typeof window !== 'undefined' ? window : globalThis);
