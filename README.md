# Part-Writing Detective

Part-Writing Detective is a web app for practice in four-part (SATB) part-writing error detection.

Each measure is a two-chord progression with one part-writing error. Select the rule that the measure breaks, then select **Check**. The app shows the correct rule, highlights the notes with the error, and gives an explanation.

The app runs in the browser. It has no build step and no server code, so you can host it on GitHub Pages. 

## Features

- Random exercises in major keys, minor keys, or both (up to 3 sharps or flats)
- 4, 6, or 8 measures in each exercise
- Grand-staff notation with Roman numerals (you can hide the Roman numerals)
- Piano playback of one measure or of all measures
- Selection of the rules to practice
- Score for each rule, saved in the browser (localStorage)
- Installation on a phone home screen
- Offline use after the first visit

## Rules

**Objectionable parallelism**

1. Parallel or contrary-motion unisons, fifths, and octaves
2. Forbidden hidden octaves in the outer voices (V6 → I with 5̂→1̂ over 7̂→1̂; V7 → I6 with 4̂→3̂), and hidden fifths in the outer voices when the soprano leaps
3. d5 → P5

**Errors of melodic function**

4. Voice overlap and voice crossing
5. V7 → I resolution (4̂→3̂; 7̂→1̂ in the soprano; 7̂→5̂ is allowed in the inner voices)
6. Unraised leading tone in minor
7. Melodic augmented 2nd
8. More than an octave between adjacent upper voices

**Errors of doubling**

9. Doubled leading tone
10. Doubled 4̂ in V7
11. Illegal incomplete chords (only root-position I and V may omit the fifth)

Rules 6 and 7 occur only in minor keys.

In `js/theory.js`, each rule has two numbers. `num` is the number that the user sees. `id` is the internal key for the checker, the generator, and saved progress. Do not change an `id`.

## Run the app on your computer

You need Node.js. The browser does not load the piano samples from a `file://` page, so you must use a local web server.

In the app folder, run this command:

```bash
node server.js
```

Open <http://localhost:8124> in a browser.

The server accepts connections only from your computer. It does not serve hidden files, such as `.git`. To connect from a phone on the same network, start the server with `HOST=0.0.0.0 node server.js`.

The first visit needs an internet connection. On the first visit, the app downloads the piano samples and the two CDN scripts. After the first visit, the app works offline. Refer to [Offline use](#offline-use).

## Put the app on GitHub Pages

1. Make a GitHub repository and push the contents of this folder to it.
2. In the repository, go to **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**. Select `main` and `/ (root)`, then select **Save**.
4. The site is at `https://<your-username>.github.io/<repo-name>/`.

## Install the app on a phone

The app is an installable web app (PWA). The setup is the same as in EarCraft.

- **iPhone or iPad (Safari):** Open the site. Tap **Share**, then tap **Add to Home Screen**.
- **Android (Chrome):** Open the site. Tap the menu, then tap **Install app** or **Add to Home screen**.

The app then opens full screen from its icon. It works offline after the first visit.

These files and tags control the installation:

- `manifest.json`
- The PNG icons
- The `apple-touch-icon` and `apple-mobile-web-app-*` tags in `index.html`

When an installed iPhone app opens again from the background, the app resumes the audio automatically. EarCraft uses the same fix.

## Offline use

The app registers a service worker, `sw.js`. This file is adapted from EarCraft. On the first online visit, the service worker saves the app files, the two CDN scripts, and the piano samples in the browser cache. After this visit, the app works offline.

- App files use network first. An online visit loads the latest code. An offline visit uses the cache.
- The CDN scripts and the samples use cache first.
- Each external file must match its integrity hash before the service worker saves it. The page checks the hash again each time it loads the file. Refer to [Subresource Integrity](#subresource-integrity). The hashes set the exact bytes of each file, so the app does not do the daily sample check that EarCraft does.

To refresh the cached app files and CDN scripts, increase `CACHE_VERSION` in `sw.js`.

If you add an app file, also add it to `APP_FILES` in `sw.js`.

Cache names start with `pwdetective-`. On GitHub Pages, all project sites of an account share one origin and one cache storage. The service worker deletes only caches that have its prefix.

## Build

- Plain HTML, CSS, and JavaScript. There is no build step.
- Piano sound: Tone.js 15.1.22 with the Salamander Grand Piano samples.
- Music notation: VexFlow 5.0.0.

### Subresource Integrity

Each file from another site has a pinned SHA-384 hash. The browser blocks a file if its bytes do not match the hash.

- **Tone.js and VexFlow (jsDelivr):** The script tags in `index.html` have `integrity` attributes. The versions and hashes are the same as in EarCraft. The service worker uses the same hashes from `CDN_SCRIPTS` in `sw.js`.
- **The 30 piano samples (tonejs.github.io):** Tone.js cannot verify its downloads. `js/audio.js` fetches each sample with the hash from `js/samples.js`, then gives the decoded audio to Tone.js. The service worker uses the same file and hashes.

If you change a script version, or if a sample changes upstream, make a new hash. If you do not, the browser blocks the file. Use this command:

```bash
curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

Add the prefix `sha384-` to the output. Then update each place that lists the file.

## Tests

You need Node.js. The generator test makes sure that each rule gives measures with exactly one error.

```bash
node tests/generator.test.js
```

## Credits

- Tone.js. MIT License. Copyright Yotam Mann and the Tone.js contributors.
- VexFlow. MIT License. Copyright Mohit Muthanna Cheppudira and the VexFlow contributors.
- Salamander Grand Piano V3. Creative Commons Attribution 3.0 (CC-BY 3.0). Created by Alexander Holm.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page layout |
| `styles.css` | Styles |
| `js/theory.js` | Chord spelling, rule checker, and exercise generator |
| `js/staff.js` | Grand-staff notation with VexFlow |
| `js/samples.js` | Piano sample list with integrity hashes |
| `js/audio.js` | Piano playback with Tone.js |
| `js/app.js` | User interface, scores, and settings |
| `icon.svg` | Logo and browser icon: a magnifying glass on parallel fifths |
| `manifest.json`, `icon-*.png`, `apple-touch-icon*.png` | Phone installation and icons |
| `sw.js` | Service worker for offline use |
| `server.js` | Static file server for local use |
| `tests/generator.test.js` | Generator test |
