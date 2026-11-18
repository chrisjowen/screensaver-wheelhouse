import { BUSY_WORDS, clock } from './idle.js';
import { createWatch } from './watch.js';

/**
 * <screensaver-indicator>: a small pill in Wheelhouse's header, on every
 * page, counting down to the screensaver; a click starts it now. The pill is
 * also where the idle watch lives, since the header is the one slot on every
 * page: the first pill on the page starts the watch, and the last one to
 * leave stops it and takes the screensaver down. Wheelhouse sets `host`,
 * `entry` and `data` (the provider's settings and fleet line); a new `data`
 * applies from then on.
 *
 * @typedef {import('./watch.js').Status} Status
 */

/** A small sail, lucide-style strokes. */
const SAIL =
	'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3v14M11 4l-6 11h6M13 6l5 9h-5M3 18h18l-2 3H5z"/></svg>';

const CSS = `
:host { display: inline-flex; font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); }
button {
	display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px;
	border-radius: 999px; border: 1px solid var(--hair, var(--border, #ddd5c4)); background: transparent;
	color: var(--muted-foreground, #5d646d); font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer;
	transition: color .2s, border-color .2s;
}
button:hover { color: var(--foreground, #121a23); border-color: var(--input, #cfc5b0); }
button:focus-visible { outline: 2px solid var(--ring, #a87412); outline-offset: 2px; }
svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.count { font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px; color: var(--foreground, #121a23); font-variant-numeric: tabular-nums; }
.count:empty { display: none; }
button[data-state=held] .count, button[data-state=manual] .count { color: var(--muted-foreground, #5d646d); }
button[data-soon] { border-color: color-mix(in srgb, var(--teal, #13836c) 55%, transparent); }
button[data-soon] .count { color: var(--teal, #13836c); }
@media (max-width: 900px) { .word { display: none; } }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
`;

/** @type {ReturnType<typeof createWatch> | null} */
let shared = null;
/** @type {Set<ScreensaverIndicator>} */
const pills = new Set();
/** @type {unknown} */
let latest = null;

/**
 * What the pill says, and its tooltip.
 * @param {Status} s
 * @returns {{ count: string, title: string, soon: boolean }}
 */
export function pillWords(s) {
	switch (s.state) {
		case 'on':
			return { count: 'on', title: 'Screensaver on', soon: false };
		case 'manual':
			return {
				count: '',
				title: 'Screensaver: starts only when you click here. Click to start it now.',
				soon: false
			};
		case 'held':
			return {
				count: 'held',
				title: `Screensaver held while ${BUSY_WORDS[s.reason]}. Click to start it now.`,
				soon: false
			};
		default: {
			const left = clock(s.leftMs);
			return {
				count: left,
				title: `Screensaver in ${left}. Click to start it now.`,
				soon: s.leftMs <= 10_000
			};
		}
	}
}

class ScreensaverIndicator extends HTMLElement {
	/** @type {any} */ host;
	/** @type {any} */ entry;
	/** @type {HTMLButtonElement} */ #button;
	/** @type {HTMLElement} */ #count;

	constructor() {
		super();
		const root = this.attachShadow({ mode: 'open' });
		const style = document.createElement('style');
		style.textContent = CSS;
		this.#button = document.createElement('button');
		this.#button.type = 'button';
		this.#button.setAttribute('aria-label', 'Start the screensaver now');
		this.#button.innerHTML = SAIL;
		const word = document.createElement('span');
		word.className = 'word';
		word.textContent = 'Screensaver';
		this.#count = document.createElement('span');
		this.#count.className = 'count';
		this.#button.append(word, this.#count);
		this.#button.addEventListener('click', () => shared?.show());
		root.append(style, this.#button);
	}

	/** @param {unknown} v the provider's value */
	set data(v) {
		latest = v;
		shared?.configure(v);
	}

	get data() {
		return latest;
	}

	connectedCallback() {
		pills.add(this);
		shared ??= createWatch({
			win: /** @type {Window & typeof globalThis} */ (window),
			onChange: (s) => pills.forEach((p) => p.render(s))
		});
		if (latest !== null) shared.configure(latest);
		this.render(shared.status());
	}

	disconnectedCallback() {
		pills.delete(this);
		if (pills.size || !shared) return;
		shared.destroy();
		shared = null;
	}

	/** @param {Status} s */
	render(s) {
		const w = pillWords(s);
		if (this.#count.textContent !== w.count) this.#count.textContent = w.count;
		this.#button.title = w.title;
		this.#button.dataset.state = s.state;
		this.#button.toggleAttribute('data-soon', w.soon);
	}
}

if (!customElements.get('screensaver-indicator')) {
	customElements.define('screensaver-indicator', ScreensaverIndicator);
}
