/* audio.js: piano playback with a Tone.js Sampler and the Salamander samples. Same engine as EarCraft. */

const Piano = (() => {
  let sampler = null;
  let reverb = null;
  let loadingPromise = null;
  let started = false;
  let timers = [];

  // Tone.Sampler cannot verify its downloads. This code fetches each sample with its SRI hash from js/samples.js.
  // The browser rejects a sample if its bytes do not match. The Sampler gets the decoded audio.
  async function fetchSample(note, { file, integrity }) {
    const res = await fetch(PIANO_SAMPLES.baseUrl + file, { integrity, mode: "cors" });
    if (!res.ok) throw new Error(`Sample ${file}: HTTP ${res.status}`);
    return [note, await Tone.getContext().decodeAudioData(await res.arrayBuffer())];
  }

  function load() {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      const buffers = Object.fromEntries(await Promise.all(
        Object.entries(PIANO_SAMPLES.notes).map(([note, sample]) => fetchSample(note, sample))));
      reverb = new Tone.Reverb({ decay: 1.6, wet: 0.18 }).toDestination();
      sampler = new Tone.Sampler({ urls: buffers, release: 1.2 }).connect(reverb);
      await Tone.loaded();
    })();
    // After a failed load (for example, offline), the next Play tries again.
    loadingPromise.catch(() => { loadingPromise = null; });
    return loadingPromise;
  }

  // On iOS, use the playback audio session, so the mute switch does not silence the app.
  function setPlaybackSession() {
    try {
      if (typeof navigator !== "undefined" && "audioSession" in navigator) {
        navigator.audioSession.type = "playback";
      }
    } catch (e) {
      /* ignore unsupported */
    }
  }

  // Resume the AudioContext if iOS suspended or interrupted it.
  // iOS does this when an installed app goes to the background or opens again. It often restores the page without a reload.
  // Does nothing if the context runs. On iOS, call it from a user gesture. Same fix as EarCraft.
  async function resumeContext() {
    try {
      const ctx = Tone.getContext();
      if (ctx && ctx.state !== "running") {
        setPlaybackSession();
        await ctx.resume();
        await Tone.start();
        started = true;
      }
    } catch (e) {
      /* ignore */
    }
  }

  // Call from a user gesture before the first sound.
  async function ensureReady() {
    if (!started) {
      setPlaybackSession();
      await Tone.start();
      started = true;
    } else {
      await resumeContext();
    }
    await load();
  }

  // Resume the AudioContext on each tap, not only the first one.
  // iOS can suspend it again after a relaunch or an interruption.
  function attachUnlock() {
    const revive = () => {
      const ctx = typeof Tone.getContext === "function" ? Tone.getContext() : null;
      if (ctx && ctx.state === "running") { started = true; return; }
      setPlaybackSession();
      Tone.start().then(() => { started = true; }).catch(() => {});
      if (ctx) ctx.resume().catch(() => {});
    };
    document.addEventListener("touchend", revive, true);
    document.addEventListener("pointerdown", revive, true);
    // When the app comes back to the foreground, try to resume. On iOS, this can need a tap.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const ctx = typeof Tone.getContext === "function" ? Tone.getContext() : null;
      if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
    });
  }
  if (typeof document !== "undefined") attachUnlock();

  function isLoaded() {
    return sampler !== null && sampler.loaded;
  }

  function stopAll() {
    timers.forEach(clearTimeout);
    timers = [];
    if (sampler) sampler.releaseAll();
  }

  // Play a list of chords (arrays of MIDI numbers).
  // `gaps` holds the indexes of chords that have a short pause after them (measure ends).
  // onChord(i) runs when chord i starts. onChord(-1) runs when playback ends.
  function playChords(chords, opts) {
    opts = opts || {};
    stopAll();
    const dur = opts.duration || 1.1;
    const gaps = opts.gaps || [];
    const now = Tone.now() + 0.06;
    let t = now;
    chords.forEach((midis, i) => {
      sampler.triggerAttackRelease(midis.map((m) => Tone.Frequency(m, "midi").toNote()), dur * 0.95, t, 0.75);
      if (opts.onChord) timers.push(setTimeout(() => opts.onChord(i), (t - Tone.now()) * 1000));
      t += dur + (gaps.includes(i) ? 0.35 : 0);
    });
    if (opts.onChord) timers.push(setTimeout(() => opts.onChord(-1), (t - Tone.now()) * 1000));
  }

  // The samples can download before a user gesture. Only the AudioContext start needs a gesture.
  return { preload: load, ensureReady, isLoaded, playChords, stopAll };
})();
