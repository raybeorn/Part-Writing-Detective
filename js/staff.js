/* staff.js: draws one two-chord SATB measure on a grand staff with VexFlow. */

const Staff = (() => {
  const W = 340;
  const H = 290;
  const KEY_NAMES = { 0: "C", 1: "G", 2: "D", 3: "A", "-1": "F", "-2": "Bb", "-3": "Eb" };
  const ACC = { "-2": "bb", "-1": "b", 0: "", 1: "#", 2: "##" };
  const LETTERS = "cdefgab";

  const vexKey = (n) => `${LETTERS[n.letter]}${ACC[n.alter]}/${n.oct}`;

  function makeNote(VF, n, clef, stemUp) {
    const note = new VF.StaveNote({ keys: [vexKey(n)], duration: "h", clef });
    note.setStemDirection(stemUp ? VF.Stem.UP : VF.Stem.DOWN);
    return note;
  }

  function makeVoice(VF, notes) {
    const voice = new VF.Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickables(notes);
    return voice;
  }

  function svgText(svg, x, y, text, cls) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("class", cls);
    el.textContent = text;
    svg.appendChild(el);
    return el;
  }

  function romanNumeral(svg, x, display) {
    const m = display.match(/^([iIvV]+°?)(.*)$/);
    const el = svgText(svg, x, H - 14, m[1], "rn");
    el.setAttribute("text-anchor", "middle");
    if (m[2]) {
      const fig = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      fig.setAttribute("class", "fig");
      fig.setAttribute("dy", "-8");
      fig.textContent = m[2];
      el.appendChild(fig);
    }
  }

  function render(container, m, opts) {
    const VF = window.VexFlow;
    opts = opts || {};
    container.innerHTML = "";
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(W, H);
    const ctx = renderer.getContext();
    const keyName = KEY_NAMES[m.key.sig];

    const tStave = new VF.Stave(14, 10, W - 24).addClef("treble").addKeySignature(keyName);
    const bStave = new VF.Stave(14, 120, W - 24).addClef("bass").addKeySignature(keyName);
    // Align the first notes of the two staves.
    const startX = Math.max(tStave.getNoteStartX(), bStave.getNoteStartX());
    tStave.setNoteStartX(startX);
    bStave.setNoteStartX(startX);
    tStave.setContext(ctx).draw();
    bStave.setContext(ctx).draw();
    new VF.StaveConnector(tStave, bStave).setType("brace").setContext(ctx).draw();
    new VF.StaveConnector(tStave, bStave).setType("singleLeft").setContext(ctx).draw();
    new VF.StaveConnector(tStave, bStave).setType("singleRight").setContext(ctx).draw();

    // voiceNotes[i] holds the notes of voice i (S, A, T, B) for both chords.
    const voiceNotes = [0, 1, 2, 3].map((vi) => m.voicings.map((v, ci) =>
      makeNote(VF, v[vi], vi < 2 ? "treble" : "bass", vi % 2 === 0)));
    const voices = voiceNotes.map((notes) => makeVoice(VF, notes));

    VF.Accidental.applyAccidentals([voices[0], voices[1]], keyName);
    VF.Accidental.applyAccidentals([voices[2], voices[3]], keyName);

    new VF.Formatter()
      .joinVoices([voices[0], voices[1]])
      .joinVoices([voices[2], voices[3]])
      .format(voices, W - 24 - (startX - 14) - 30);
    voices[0].draw(ctx, tStave);
    voices[1].draw(ctx, tStave);
    voices[2].draw(ctx, bStave);
    voices[3].draw(ctx, bStave);

    // Add chord (c0, c1) and voice (v0 to v3) classes to each note, so the app can highlight it.
    voiceNotes.forEach((notes, vi) => notes.forEach((note, ci) => {
      const el = note.getSVGElement();
      if (el) el.classList.add(`c${ci}`, `v${vi}`);
    }));

    const svg = container.querySelector("svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";

    if (opts.romanNumerals !== false) {
      const k = m.key.mode === "major" ? m.key.name : m.key.name.toLowerCase();
      svgText(svg, 16, H - 14, `${k}:`, "rn key");
      voiceNotes[3].forEach((note, ci) => {
        const x = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
        romanNumeral(svg, x, m.chords[ci].display);
      });
    }
    return svg;
  }

  // Add class `cls` to the notes in `pairs` ([chordIndex, voiceIndex]).
  function mark(container, pairs, cls) {
    pairs.forEach(([c, v]) => {
      container.querySelectorAll(`.c${c}.v${v}`).forEach((el) => el.classList.add(cls));
    });
  }

  function clear(container, cls) {
    container.querySelectorAll(`.${cls}`).forEach((el) => el.classList.remove(cls));
  }

  return { render, mark, clear };
})();
