import { readSettings } from '../ui/settings.js';

/**
 * Screensaver: after a spell with no activity, Wheelhouse blurs and a boat
 * sails across the middle, with calm music if the captain wants it; any
 * mouse move, click or key brings the page straight back.
 *
 * Everything happens in the page. The header indicator, which Wheelhouse
 * draws on every page, keeps the idle watch and draws the screensaver over
 * the whole window. This one fleet provider only hands it the captain's
 * settings and, for the branded scene's card, how many tasks are under way
 * and how many wait on the captain. It runs no command, reads no file and
 * makes no network call.
 */

/** Statuses that are over: they are not under way. */
const OVER = new Set(['landed', 'done']);

/**
 * @param {unknown} tasks the fleet's tasks, as Wheelhouse hands them to plugins
 * @returns {{ underWay: number, needYou: number }}
 */
export function fleetLine(tasks) {
	const list = Array.isArray(tasks) ? tasks : [];
	let underWay = 0;
	let needYou = 0;
	for (const t of list) {
		if (!t || typeof t !== 'object') continue;
		if (!OVER.has(String(t.status)) && !t.mergedAt) underWay++;
		if (t.attention?.owner === 'captain') needYou++;
	}
	return { underWay, needYou };
}

/** @param {any} ctx */
export function readView(ctx) {
	return { settings: readSettings(ctx.settings), fleet: fleetLine(ctx.tasks) };
}

export default {
	providers: [
		{
			id: 'watch',
			scope: 'fleet',
			// Short, so a setting saved in Settings → Plugins reaches the page soon.
			ttlMs: 15_000,
			timeoutMs: 2_000,
			async fetch(/** @type {any} */ ctx) {
				return {
					available: true,
					value: readView(ctx),
					source: 'your settings',
					observedAt: null
				};
			}
		}
	],
	contributions: [
		{
			slot: 'header.indicator',
			id: 'watch',
			title: 'Screensaver',
			provider: 'watch',
			render: { element: 'screensaver-indicator' }
		}
	]
};
