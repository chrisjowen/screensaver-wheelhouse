# Screensaver

A [Wheelhouse](https://github.com/chrisjowen/wheelhouse) plugin. When you step away, Wheelhouse blurs and a boat sails slowly across the middle of the screen, with calm music if you want it. Any mouse move, click, key, scroll or touch brings you straight back.

## What it does

- **Header pill.** A small **Screensaver** pill in the header counts down to the screensaver, for example “Screensaver 4:59”. Click it to start the screensaver now.
- **Starting.** After the timeout with no activity (5 minutes by default), the whole page fades to a blurred, dimmed layer. A boat crosses it in about 46 seconds, bobbing on parallax waves and leaving a wake and a reflection.
- **Waking.** The first real activity brings the page back. A mouse jiggle of a few pixels does not count. The click or key that wakes the page is swallowed, so it never presses a button or types into a box underneath.
- **When it holds off.** It never starts while:
  - you have text in a box, typed or not yet sent;
  - a dialog is open;
  - Wheelhouse is listening for dictation or a Live discussion is on;
  - a video or sound is playing;
  - something is full screen;
  - the tab is in the background.

  While it holds off, the pill reads **held**, and its tooltip says why.

- **Reduced motion.** If your system asks for reduced motion, it shows one still picture with the boat near the middle. Nothing sails, bobs, twinkles or drifts, and the fades are short.
- **Scenes:**
  - **Dusk sea:** a low sun with a glitter path. This is the default.
  - **Starry night:** stars, a full moon and a moon path.
  - **Harbour fog:** drifting fog and a lighthouse with a sweeping beam.
  - **Wheelhouse:** the branded card. It has a navy grid, a turning ship’s wheel, “All _quiet_ on deck” and how many tasks are under way and need you.
- **Boats:** a sloop, a schooner or a paper boat.
- **Music.** A slow pad made in the browser with Web Audio, with a chord every few seconds, a soft bell now and then and a sea swell. Each scene has its own chords. Nothing is downloaded. Browsers let a page play sound only after a click or key press, so after a reload the music waits until you have clicked or typed in Wheelhouse once.

## Install

```sh
wheelhouse plugin install chrisjowen/screensaver-wheelhouse
```

`install` shows what the plugin adds and asks for each setting, offering its default; press Enter to take it. Wheelhouse then restarts to load the plugin.

## Turn it on

The plugin is off until you turn it on. Open **Settings → Plugins**, find **Screensaver** and switch it on for every project. A screensaver covers all of Wheelhouse, so it is on or off for the whole fleet. You can also set it in `plugins.json` in Wheelhouse’s config directory:

```json
{ "plugins": { "screensaver": { "enabled": true } } }
```

## Settings

All of these are optional. Change them on the plugin’s page in **Settings → Plugins**. They reach the page within about 15 seconds, without a restart.

| Setting   | Default | What it does                                                                                                                   |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `timeout` | `5`     | Minutes with no activity before it starts: `1`, `2`, `5`, `10`, `15`, `30` or `60`, or `never` to start it only from the pill. |
| `scene`   | `dusk`  | `dusk` (Dusk sea), `night` (Starry night), `fog` (Harbour fog) or `wheelhouse` (the branded card).                             |
| `boat`    | `sloop` | `sloop`, `schooner` or `paper`.                                                                                                |
| `sound`   | `false` | Play calm music while it shows.                                                                                                |
| `volume`  | `40`    | Music volume, 0 to 100.                                                                                                        |

## What it reads

Everything runs in the page. The header element keeps the idle watch and draws the screensaver over the whole window. The plugin has one fleet provider, which hands the page your settings and, for the branded card, how many tasks are under way and how many wait on you. It counts these from the tasks Wheelhouse already gives plugins. It runs no command, reads no file, makes no network call and loads no audio or image files.

## Layout

```
.wheelhouse-plugin/plugin.json   the manifest and its settings
wheelhouse/server/index.js       the provider and the header contribution
wheelhouse/ui/index.js           <screensaver-indicator>, the header pill
wheelhouse/ui/watch.js           the idle watch: activity, timing, waking
wheelhouse/ui/idle.js            when the page is busy, and the countdown
wheelhouse/ui/overlay.js         the blurred layer, the card and the hint
wheelhouse/ui/scenes.js          the scenes and boats, drawn on a canvas
wheelhouse/ui/music.js           the Web Audio music
wheelhouse/ui/settings.js        the settings, with defaults (shared with the server)
```

There is no build step and no runtime dependency. Wheelhouse imports the files as they are.

## Development

```sh
npm ci
npm run lint   # ESLint and Prettier
npm test       # node --test, with the page parts tested in happy-dom
```

`tests/fixtures/plugin.schema.json` is a copy of the Wheelhouse SDK’s manifest schema, so the tests run offline.

## Licence

MIT
