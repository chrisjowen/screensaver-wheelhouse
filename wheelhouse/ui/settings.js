/**
 * The screensaver's settings: the choices the manifest offers, their
 * defaults, and how a value from the captain's plugins file is read. Pure, so
 * the server entry (which hands the settings to the page) and the page's own
 * element (which reads whatever arrives as `data`) share one reading.
 *
 * Wheelhouse hands the file's values over as they are, so anything missing,
 * of the wrong type or not one of the choices falls back to its default.
 */

/** @typedef {{ value: string, label: string }} Option */
/**
 * @typedef {{
 *   timeout: string,
 *   scene: 'dusk' | 'night' | 'fog' | 'wheelhouse',
 *   boat: 'sloop' | 'schooner' | 'paper',
 *   sound: boolean,
 *   volume: number
 * }} Settings
 */

/** How long Wheelhouse waits with no activity before it sails, in minutes. */
export const TIMEOUTS = /** @type {const} */ ([
	{ value: '1', label: '1 minute' },
	{ value: '2', label: '2 minutes' },
	{ value: '5', label: '5 minutes' },
	{ value: '10', label: '10 minutes' },
	{ value: '15', label: '15 minutes' },
	{ value: '30', label: '30 minutes' },
	{ value: '60', label: '1 hour' },
	{ value: 'never', label: 'Never: only when I click it in the header' }
]);

export const SCENES = /** @type {const} */ ([
	{ value: 'dusk', label: 'Dusk sea' },
	{ value: 'night', label: 'Starry night' },
	{ value: 'fog', label: 'Harbour fog' },
	{ value: 'wheelhouse', label: 'Wheelhouse (branded card)' }
]);

export const BOATS = /** @type {const} */ ([
	{ value: 'sloop', label: 'Sloop' },
	{ value: 'schooner', label: 'Schooner' },
	{ value: 'paper', label: 'Paper boat' }
]);

/** @type {Readonly<Settings>} */
export const DEFAULTS = Object.freeze({
	timeout: '5',
	scene: 'dusk',
	boat: 'sloop',
	sound: false,
	volume: 40
});

/**
 * One of the options, by its value or its label (`wheelhouse plugin install
 * --setting` takes either), ignoring case and spaces at the ends.
 * @param {readonly Option[]} options
 * @param {unknown} v
 * @returns {string | null}
 */
function choice(options, v) {
	if (typeof v !== 'string' && typeof v !== 'number') return null;
	const s = String(v).trim().toLowerCase();
	const hit = options.find((o) => o.value === s || o.label.toLowerCase() === s);
	return hit ? hit.value : null;
}

/** @param {unknown} v */
function yesNo(v) {
	if (typeof v === 'boolean') return v;
	if (typeof v !== 'string') return null;
	const s = v.trim().toLowerCase();
	if (['yes', 'true', 'on'].includes(s)) return true;
	if (['no', 'false', 'off'].includes(s)) return false;
	return null;
}

/**
 * A volume from 0 to 100; a number outside that is held to the nearer end.
 * @param {unknown} v
 */
function volume(v) {
	const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
	if (!Number.isFinite(n)) return null;
	return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * The settings from the plugins file (`ctx.settings`), with defaults filled in.
 * @param {unknown} raw
 * @returns {Settings}
 */
export function readSettings(raw) {
	const s = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {});
	return {
		timeout: choice(TIMEOUTS, s.timeout) ?? DEFAULTS.timeout,
		scene: /** @type {Settings['scene']} */ (choice(SCENES, s.scene) ?? DEFAULTS.scene),
		boat: /** @type {Settings['boat']} */ (choice(BOATS, s.boat) ?? DEFAULTS.boat),
		sound: yesNo(s.sound) ?? DEFAULTS.sound,
		volume: volume(s.volume) ?? DEFAULTS.volume
	};
}

/**
 * How long to wait with no activity, in milliseconds; null when it never
 * starts by itself.
 * @param {string} timeout one of the TIMEOUTS' values
 * @returns {number | null}
 */
export function idleMs(timeout) {
	const value = choice(TIMEOUTS, timeout) ?? DEFAULTS.timeout;
	return value === 'never' ? null : Number(value) * 60_000;
}
