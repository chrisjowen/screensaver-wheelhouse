import { busyReason, remainingMs } from './idle.js';
import { createMusic } from './music.js';
import { Overlay } from './overlay.js';
import { DEFAULTS, idleMs, readSettings } from './settings.js';

/**
 * The idle watch: notes every mouse move, click, key, scroll and touch on the
 * page; once there has been none for the captain's timeout, and nothing
 * holds it off, opens the screensaver; and closes it again on the first
 * activity, swallowing the click or key that woke it so it never presses
 * anything underneath.
 *
 * @typedef {import('./settings.js').Settings} Settings
 * @typedef {import('./idle.js').Busy} Busy
 * @typedef {{ underWay: number, needYou: number }} Fleet
 * @typedef {(
 *   | { state: 'on' }
 *   | { state: 'counting', leftMs: number }
 *   | { state: 'held', reason: Busy }
 *   | { state: 'manual' }
 * )} Status
 */

/** A pointer must move this far, in CSS pixels, to wake the page. */
export const WAKE_MOVE_PX = 4;
/** For this long after it opens, input does not close it (the click that opened a preview). */
export const GRACE_MS = 700;
/** For this long after a click or key wakes the page, the rest of that click or key is swallowed. */
export const SWALLOW_MS = 600;
/** How often the watch looks at the clock. */
export const TICK_MS = 250;

/** Input that counts as activity, and wakes the page while the screensaver shows. */
const ACTIVITY = [
	'pointermove',
	'pointerdown',
	'mousemove',
	'mousedown',
	'keydown',
	'wheel',
	'touchstart',
	'scroll'
];
/** Input the screensaver keeps from the page while it shows and just after it wakes. */
const SWALLOWED = new Set([
	'pointerdown',
	'pointerup',
	'mousedown',
	'mouseup',
	'click',
	'dblclick',
	'auxclick',
	'contextmenu',
	'keydown',
	'keypress',
	'keyup'
]);
/** Input that can carry on into the page if not swallowed, so is listened for too. */
const FOLLOW_UP = [
	'pointerup',
	'mouseup',
	'click',
	'dblclick',
	'auxclick',
	'contextmenu',
	'keypress',
	'keyup'
];
/** Events the browser lets a page block; passive listeners for the rest keep scrolling smooth. */
const BLOCKING = new Set([...SWALLOWED]);

/**
 * @param {{
 *   win: Window & typeof globalThis,
 *   now?: () => number,
 *   onChange?: (status: Status) => void
 * }} o
 */
export function createWatch({ win, now = () => win.performance.now(), onChange }) {
	const doc = win.document;
	/** @type {Settings} */
	let settings = { ...DEFAULTS };
	/** @type {Fleet | null} */
	let fleet = null;
	let last = now();
	let shownAt = 0;
	/** @type {{ x: number, y: number } | null} */
	let startPt = null;
	let swallowUntil = 0;
	/** @type {Overlay | null} */
	let overlay = null;
	const music = createMusic(win);
	/** @type {Status | null} */
	let reported = null;

	const isOn = () => Boolean(overlay?.isOpen);

	function report() {
		const s = status();
		const same =
			reported &&
			reported.state === s.state &&
			(s.state !== 'counting' ||
				Math.ceil(s.leftMs / 1000) === Math.ceil(/** @type {any} */ (reported).leftMs / 1000)) &&
			(s.state !== 'held' || s.reason === /** @type {any} */ (reported).reason);
		if (same) return;
		reported = s;
		onChange?.(s);
	}

	/** @returns {Status} */
	function status() {
		if (isOn()) return { state: 'on' };
		const wait = idleMs(settings.timeout);
		if (wait === null) return { state: 'manual' };
		const reason = busyReason(doc);
		if (reason) return { state: 'held', reason };
		return { state: 'counting', leftMs: /** @type {number} */ (remainingMs(last, now(), wait)) };
	}

	function touch() {
		last = now();
	}

	function syncMusicMark() {
		overlay?.music(isOn() && music.audible);
	}
	music.onState = syncMusicMark;

	/** Opens the screensaver now, whatever the clock says. */
	function show() {
		if (isOn()) return;
		overlay ??= new Overlay(win);
		shownAt = now();
		startPt = null;
		overlay.open(settings, fleet);
		if (settings.sound) music.start(settings.scene, settings.volume / 100);
		syncMusicMark();
		report();
	}

	function hide() {
		if (!isOn()) return;
		overlay?.close();
		music.stop();
		touch();
		report();
	}

	/** @param {Event} e */
	function swallow(e) {
		if (!BLOCKING.has(e.type)) return;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	/** @param {Event} e */
	function onInput(e) {
		const t = now();
		if (e.type === 'pointerdown' || e.type === 'keydown') {
			if (settings.sound) music.unlock();
		}
		if (!isOn()) {
			if (t < swallowUntil && SWALLOWED.has(e.type)) return swallow(e);
			if (ACTIVITY.includes(e.type)) touch();
			return;
		}
		// The screensaver shows. Nothing reaches the page; the right input wakes it.
		swallow(e);
		if (!ACTIVITY.includes(e.type)) return;
		if (t - shownAt < GRACE_MS) return;
		if (e.type === 'pointermove' || e.type === 'mousemove') {
			const m = /** @type {MouseEvent} */ (e);
			if (!startPt) {
				startPt = { x: m.clientX, y: m.clientY };
				return;
			}
			if (Math.hypot(m.clientX - startPt.x, m.clientY - startPt.y) < WAKE_MOVE_PX) return;
		}
		if (SWALLOWED.has(e.type) || e.type === 'touchstart') swallowUntil = t + SWALLOW_MS;
		hide();
	}

	function onVisibility() {
		// Coming back to the tab is activity; leaving it while the screensaver shows ends it.
		if (doc.hidden) hide();
		touch();
		report();
	}

	function tick() {
		if (!isOn()) {
			const s = status();
			if (s.state === 'held') touch();
			else if (s.state === 'counting' && s.leftMs <= 0) return show();
		}
		report();
	}

	const types = [...new Set([...ACTIVITY, ...FOLLOW_UP])];
	for (const type of types)
		win.addEventListener(type, onInput, { capture: true, passive: !BLOCKING.has(type) });
	doc.addEventListener('visibilitychange', onVisibility);
	const timer = setInterval(tick, TICK_MS);

	return {
		/**
		 * The provider's value, as the element receives it.
		 * @param {unknown} data
		 */
		configure(data) {
			const d = /** @type {Record<string, any>} */ (data && typeof data === 'object' ? data : {});
			const before = settings.timeout;
			settings = readSettings(d.settings);
			const f = d.fleet;
			fleet =
				f && Number.isFinite(f.underWay) && Number.isFinite(f.needYou)
					? { underWay: f.underWay, needYou: f.needYou }
					: null;
			// A new timeout counts from now, not from the last activity.
			if (settings.timeout !== before) touch();
			report();
		},
		show,
		hide,
		tick,
		status,
		get settings() {
			return settings;
		},
		get overlay() {
			return overlay;
		},
		destroy() {
			clearInterval(timer);
			for (const type of types) win.removeEventListener(type, onInput, { capture: true });
			doc.removeEventListener('visibilitychange', onVisibility);
			music.close();
			overlay?.destroy();
			overlay = null;
		}
	};
}
