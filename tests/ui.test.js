import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://127.0.0.1:4310/' });
const GLOBALS = ['window', 'document', 'HTMLElement', 'customElements'];
/** @type {Record<string, any>} */
const saved = {};
/** @type {typeof import('../wheelhouse/ui/index.js')} */
let ui;

before(async () => {
	for (const k of GLOBALS) {
		saved[k] = /** @type {any} */ (globalThis)[k];
		/** @type {any} */ (globalThis)[k] = k === 'window' ? window : /** @type {any} */ (window)[k];
	}
	ui = await import('../wheelhouse/ui/index.js');
});
after(async () => {
	document.body.replaceChildren();
	await window.happyDOM.close();
	for (const k of GLOBALS) /** @type {any} */ (globalThis)[k] = saved[k];
});

/** @param {unknown} data */
function mount(data) {
	const el = /** @type {any} */ (document.createElement('screensaver-indicator'));
	el.host = { pluginId: 'screensaver', service: async () => null, launch: async () => null };
	el.entry = {
		key: 'k',
		slot: 'header.indicator',
		pluginId: 'screensaver',
		contributionId: 'watch'
	};
	el.data = data;
	document.body.append(el);
	return el;
}
const button = (/** @type {any} */ el) => el.shadowRoot.querySelector('button');
const overlay = () => document.querySelector('[data-screensaver]');

describe('<screensaver-indicator>', () => {
	beforeEach(() => document.body.replaceChildren());

	it('counts down to the screensaver in the header', () => {
		const el = mount({ settings: { timeout: '5' } });
		const b = button(el);
		assert.equal(b.querySelector('.count').textContent, '5:00');
		assert.equal(b.dataset.state, 'counting');
		assert.equal(b.getAttribute('aria-label'), 'Start the screensaver now');
		assert.match(b.title, /Screensaver in 5:00/);
	});

	it('starts the screensaver on a click, and the last pill to go takes it down', () => {
		const el = mount({ settings: { timeout: '5' } });
		button(el).click();
		assert.ok(overlay()?.hasAttribute('data-on'));
		assert.equal(button(el).querySelector('.count').textContent, 'on');
		el.remove();
		assert.equal(overlay(), null);
	});

	it('says when it starts only from the header', () => {
		const el = mount({ settings: { timeout: 'never' } });
		assert.equal(button(el).dataset.state, 'manual');
		assert.equal(button(el).querySelector('.count').textContent, '');
		el.remove();
	});

	it('words each state for the pill', () => {
		assert.deepEqual(ui.pillWords({ state: 'counting', leftMs: 7_000 }), {
			count: '0:07',
			title: 'Screensaver in 0:07. Click to start it now.',
			soon: true
		});
		assert.equal(ui.pillWords({ state: 'held', reason: 'dialog' }).count, 'held');
		assert.match(ui.pillWords({ state: 'held', reason: 'dialog' }).title, /a dialog is open/);
		assert.equal(ui.pillWords({ state: 'on' }).count, 'on');
	});
});
