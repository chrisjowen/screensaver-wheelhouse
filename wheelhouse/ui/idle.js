/**
 * When the page counts as busy, so the screensaver holds off even though no
 * mouse or key has moved: the captain has text in a box (typing, or a
 * message not sent yet), a dialog is open, Wheelhouse is dictating or in a
 * Live discussion, a video or sound is playing, something is full screen, or
 * the tab is not showing at all.
 */

/** @typedef {'hidden' | 'typing' | 'dialog' | 'recording' | 'live' | 'playing' | 'fullscreen'} Busy */

/** Plain words for the pill's tooltip. */
export const BUSY_WORDS = /** @type {const} */ ({
	hidden: 'the tab is in the background',
	typing: 'you have text in a box',
	dialog: 'a dialog is open',
	recording: 'Wheelhouse is listening to your voice',
	live: 'a Live discussion is on',
	playing: 'something is playing',
	fullscreen: 'something is full screen'
});

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', '']);

/**
 * The element that has focus, looking inside open shadow roots.
 * @param {Document} doc
 * @returns {Element | null}
 */
function focused(doc) {
	let el = doc.activeElement;
	while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
	return el;
}

/**
 * Does this element take typing, and does it hold any text now?
 * @param {Element | null} el
 */
function hasText(el) {
	if (!el) return false;
	const tag = el.tagName;
	if (tag === 'TEXTAREA') return /** @type {HTMLTextAreaElement} */ (el).value.trim() !== '';
	if (tag === 'INPUT') {
		const input = /** @type {HTMLInputElement} */ (el);
		return (
			TEXT_INPUTS.has((input.getAttribute('type') ?? '').toLowerCase()) && input.value.trim() !== ''
		);
	}
	const editable =
		/** @type {HTMLElement} */ (el).isContentEditable ||
		el.getAttribute('contenteditable') === 'true';
	return editable && (el.textContent ?? '').trim() !== '';
}

/** @param {Element} el */
function showing(el) {
	if (el.closest('[hidden], [inert]')) return false;
	const check = /** @type {any} */ (el).checkVisibility;
	return typeof check === 'function' ? check.call(el) !== false : true;
}

/**
 * Why the screensaver should not start now, or null when nothing holds it.
 * @param {Document} doc
 * @returns {Busy | null}
 */
export function busyReason(doc) {
	if (doc.hidden) return 'hidden';
	if (hasText(focused(doc))) return 'typing';
	const dialogs = doc.querySelectorAll(
		'dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]'
	);
	for (const d of dialogs) if (showing(d)) return 'dialog';
	// Wheelhouse marks its dictation button while it listens, and its Live bar while a discussion is on.
	if (doc.querySelector('[data-dictating]')) return 'recording';
	if (doc.querySelector('[data-live-bar]')) return 'live';
	for (const m of doc.querySelectorAll('video, audio')) {
		const media = /** @type {HTMLMediaElement} */ (m);
		if (!media.paused && !media.ended) return 'playing';
	}
	if (doc.fullscreenElement) return 'fullscreen';
	return null;
}

/**
 * How long until the screensaver starts, given when the page last saw
 * activity; null when it never starts by itself.
 * @param {number} last when the last activity was, in ms
 * @param {number} now
 * @param {number | null} idleMs
 */
export function remainingMs(last, now, idleMs) {
	if (idleMs === null) return null;
	return Math.max(0, idleMs - (now - last));
}

/**
 * The countdown as the pill shows it: "4:59", "0:07".
 * @param {number} ms
 */
export function clock(ms) {
	const s = Math.ceil(ms / 1000);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const ss = String(s % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
