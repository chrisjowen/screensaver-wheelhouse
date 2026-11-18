import { CROSSING_S, drawScene } from './scenes.js';

/**
 * The screensaver itself: a layer over the whole window that blurs and dims
 * Wheelhouse, with the scene on a canvas, the branded scene's card, a hint
 * on how to come back, and a small "Music" mark while music plays. It lives
 * in a shadow root on the page's body, so Wheelhouse's styles and its own
 * never meet. It draws; the watcher decides when it opens and closes.
 */

const CSS = `
:host {
	position: fixed; inset: 0; z-index: 2147483000;
	opacity: 0; visibility: hidden; pointer-events: none;
	transition: opacity .55s ease, visibility 0s linear .55s;
	-webkit-backdrop-filter: blur(16px) saturate(.75) brightness(.85);
	backdrop-filter: blur(16px) saturate(.75) brightness(.85);
	font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
	contain: strict;
}
:host([data-on]) {
	opacity: 1; visibility: visible; pointer-events: auto; cursor: none;
	transition: opacity 1.6s ease, visibility 0s;
}
canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.card {
	position: absolute; left: 50%; top: 21%; transform: translate(-50%, 10px);
	width: max-content; max-width: calc(100vw - 32px); text-align: center; color: #eef1f3;
	opacity: 0; transition: opacity 1.2s ease .6s, transform 1.2s ease .6s;
}
:host([data-on]) .card.show { opacity: 1; transform: translate(-50%, 0); }
.lab {
	margin: 0; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.72rem;
	letter-spacing: 0.32em; text-transform: uppercase; color: #8e9aa6;
}
.lab b { color: #e8b04a; font-weight: 500; }
h2 {
	margin: 14px 0 12px; font-family: var(--font-title, 'Instrument Serif', Georgia, serif);
	font-weight: 400; font-size: clamp(2.6rem, 7vw, 5.6rem); line-height: 1; letter-spacing: -0.015em;
}
h2 em { color: #e8b04a; }
.sub { margin: 0; font-size: 1.05rem; color: #b9c2cb; }
.stats {
	display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 18px; margin-top: 18px;
	font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.72rem; letter-spacing: .12em; color: #8e9aa6;
}
.stats i { font-style: normal; color: #3cc6a8; }
.hint {
	position: absolute; left: 0; right: 0; bottom: 6%; margin: 0; padding: 0 16px; text-align: center;
	font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.66rem; letter-spacing: .3em;
	text-transform: uppercase; color: rgb(238 241 243 / .45);
	opacity: 0; transition: opacity 1.4s ease 2.5s;
}
:host([data-on]) .hint { opacity: 1; }
.music {
	position: absolute; right: 22px; bottom: 20px; display: flex; gap: 6px; align-items: center;
	font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.62rem; letter-spacing: .2em;
	text-transform: uppercase; color: rgb(238 241 243 / .38);
}
.music[hidden] { display: none; }
.music i { display: inline-block; width: 3px; height: 10px; background: currentColor; border-radius: 2px; animation: eq 1.6s ease-in-out infinite; }
.music i:nth-child(2) { animation-delay: .3s; }
.music i:nth-child(3) { animation-delay: .6s; }
@keyframes eq { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
	:host, :host([data-on]) { transition-duration: .25s; }
	.card { transition: opacity .25s; transform: translate(-50%, 0); }
	.hint { transition: opacity .25s; }
	.music i { animation: none; }
}
`;

/**
 * @param {Document} doc
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(Node | string)[]} [kids]
 */
function h(doc, tag, attrs = {}, kids = []) {
	const el = doc.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	el.append(...kids);
	return el;
}

/**
 * @param {number} n
 * @param {string} one
 * @param {string} many
 */
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export class Overlay {
	/** @type {HTMLElement} */ host;
	/** @type {HTMLCanvasElement} */ #canvas;
	/** @type {CanvasRenderingContext2D | null} */ #ctx = null;
	/** @type {HTMLElement} */ #card;
	/** @type {HTMLElement} */ #music;
	#scene = 'dusk';
	#boat = 'sloop';
	#raf = 0;
	#t0 = 0;
	#dpr = 1;
	#on = false;
	/** @type {MediaQueryList | null} */
	#reducedQuery;
	#onResize = () => this.#redraw();
	#onReducedChange = () => this.#redraw();

	/** @param {Window & typeof globalThis} win */
	constructor(win) {
		this.win = win;
		const doc = win.document;
		this.host = h(doc, 'div', { 'data-screensaver': '', 'aria-hidden': 'true' });
		const root = this.host.attachShadow({ mode: 'open' });
		const style = doc.createElement('style');
		style.textContent = CSS;
		this.#canvas = /** @type {HTMLCanvasElement} */ (h(doc, 'canvas'));
		this.#card = h(doc, 'div', { class: 'card' });
		this.#music = h(doc, 'div', { class: 'music', hidden: '' }, [
			h(doc, 'i'),
			h(doc, 'i'),
			h(doc, 'i'),
			' Music'
		]);
		root.append(
			style,
			this.#canvas,
			this.#card,
			h(doc, 'p', { class: 'hint' }, ['Move the mouse or press any key to come back']),
			this.#music
		);
		// A touch on the screensaver wakes the page and nothing under it.
		this.host.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
		doc.body.append(this.host);
		this.#reducedQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
		this.#reducedQuery?.addEventListener?.('change', this.#onReducedChange);
		win.addEventListener('resize', this.#onResize);
	}

	get isOpen() {
		return this.#on;
	}

	get reduced() {
		return Boolean(this.#reducedQuery?.matches);
	}

	/**
	 * @param {{ scene: string, boat: string }} settings
	 * @param {{ underWay: number, needYou: number } | null} fleet
	 */
	open(settings, fleet) {
		this.#scene = settings.scene;
		this.#boat = settings.boat;
		this.#fillCard(fleet);
		this.#on = true;
		this.#t0 = this.win.performance.now();
		this.host.setAttribute('data-on', '');
		this.#redraw();
	}

	close() {
		if (!this.#on) return;
		this.#on = false;
		this.host.removeAttribute('data-on');
		this.music(false);
		// The last frame stays on the canvas while the layer fades out.
		this.#cancel();
	}

	/** @param {boolean} on show the "Music" mark */
	music(on) {
		this.#music.hidden = !on;
	}

	destroy() {
		this.#on = false;
		this.#cancel();
		this.#reducedQuery?.removeEventListener?.('change', this.#onReducedChange);
		this.win.removeEventListener('resize', this.#onResize);
		this.host.remove();
	}

	/** @param {{ underWay: number, needYou: number } | null} fleet */
	#fillCard(fleet) {
		const doc = this.win.document;
		const brand = this.#scene === 'wheelhouse';
		this.#card.classList.toggle('show', brand);
		if (!brand) return this.#card.replaceChildren();
		const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		const waiting = fleet?.needYou ?? 0;
		const title = waiting
			? ['Holding ', h(doc, 'em', {}, ['steady'])]
			: ['All ', h(doc, 'em', {}, ['quiet']), ' on deck'];
		const sub = waiting
			? `Firstmate is keeping watch. ${count(waiting, 'thing waits', 'things wait')} for you when you’re back.`
			: 'Firstmate is keeping watch while you’re away.';
		this.#card.replaceChildren(
			h(doc, 'p', { class: 'lab' }, [h(doc, 'b', {}, ['Wheelhouse']), ` · on watch · ${time}`]),
			h(doc, 'h2', {}, title),
			h(doc, 'p', { class: 'sub' }, [sub]),
			...(fleet
				? [
						h(doc, 'div', { class: 'stats' }, [
							h(doc, 'span', {}, [h(doc, 'i', {}, ['●']), ` ${fleet.underWay} under way`]),
							h(doc, 'span', {}, [`${count(waiting, 'needs', 'need')} you`])
						])
					]
				: [])
		);
	}

	#cancel() {
		if (this.#raf) this.win.cancelAnimationFrame?.(this.#raf);
		this.#raf = 0;
	}

	#size() {
		this.#dpr = Math.min(2, this.win.devicePixelRatio || 1);
		this.#canvas.width = Math.round(this.win.innerWidth * this.#dpr);
		this.#canvas.height = Math.round(this.win.innerHeight * this.#dpr);
		this.#ctx ??= this.#canvas.getContext?.('2d') ?? null;
	}

	#redraw() {
		if (!this.#on) return;
		this.#size();
		this.#cancel();
		this.#frame(this.win.performance.now());
	}

	/** @param {number} now */
	#frame(now) {
		this.#raf = 0;
		const c = this.#ctx;
		if (!this.#on || !c) return;
		const w = this.win.innerWidth;
		const h = this.win.innerHeight;
		c.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
		if (this.reduced) {
			// One still frame: nothing sails, bobs, twinkles or drifts.
			drawScene(c, w, h, 0, this.#scene, this.#boat, 0, { still: true });
			return;
		}
		const t = (now - this.#t0) / 1000;
		drawScene(c, w, h, t, this.#scene, this.#boat, (t / CROSSING_S + 0.04) % 1);
		this.#raf = this.win.requestAnimationFrame((n) => this.#frame(n));
	}
}
