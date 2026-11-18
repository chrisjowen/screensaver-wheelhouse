import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { Window } from 'happy-dom';

import { GRACE_MS, SWALLOW_MS, createWatch } from '../wheelhouse/ui/watch.js';

const window = new Window({ url: 'http://127.0.0.1:4310/' });
const document = window.document;
after(() => window.happyDOM.close());

const MIN = 60_000;
let t = 0;
/** @type {ReturnType<typeof createWatch>} */
let watch;
/** @type {any[]} */
let changes;

/** @param {Record<string, unknown>} settings */
function start(settings = {}) {
	changes = [];
	watch = createWatch({
		win: /** @type {any} */ (window),
		now: () => t,
		onChange: (s) => changes.push(s)
	});
	watch.configure({ settings: { timeout: '1', ...settings }, fleet: { underWay: 3, needYou: 0 } });
}
/** @param {number} ms */
function wait(ms) {
	t += ms;
	watch.tick();
}
const isOn = () => document.querySelector('[data-screensaver]')?.hasAttribute('data-on') ?? false;
/** @param {string} type @param {Record<string, unknown>} [init] @param {EventTarget} [at] */
function fire(type, init = {}, at = window) {
	const Ctor = type.startsWith('key') ? window.KeyboardEvent : window.MouseEvent;
	const e = new Ctor(type, { bubbles: true, cancelable: true, ...init });
	at.dispatchEvent(/** @type {any} */ (e));
	return e;
}

describe('the idle watch', () => {
	beforeEach(() => {
		t = 1_000_000;
		document.body.replaceChildren();
		start();
	});
	afterEach(() => watch.destroy());

	it('opens after the timeout with no activity, and not before', () => {
		wait(MIN - 1_000);
		assert.equal(isOn(), false);
		assert.deepEqual(watch.status(), { state: 'counting', leftMs: 1_000 });
		wait(1_000);
		assert.equal(isOn(), true);
		assert.deepEqual(watch.status(), { state: 'on' });
	});

	it('counts again from each mouse move, key, scroll or touch', () => {
		for (const type of ['pointermove', 'keydown', 'wheel', 'scroll', 'touchstart', 'mousedown']) {
			wait(MIN - 5_000);
			fire(type);
			wait(MIN - 5_000);
			assert.equal(isOn(), false, `${type} should count as activity`);
			fire(type);
		}
	});

	it('uses the timeout from the settings, counting it from when it changed', () => {
		watch.configure({ settings: { timeout: '5' } });
		wait(4 * MIN);
		assert.equal(isOn(), false);
		wait(MIN);
		assert.equal(isOn(), true);
	});

	it('never opens by itself when the timeout is never, but does when asked', () => {
		watch.configure({ settings: { timeout: 'never' } });
		wait(10 * 60 * MIN);
		assert.equal(isOn(), false);
		assert.deepEqual(watch.status(), { state: 'manual' });
		watch.show();
		assert.equal(isOn(), true);
	});

	it('holds off while there is text in a box, and counts from when it clears', () => {
		const box = document.createElement('textarea');
		document.body.append(box);
		box.focus();
		box.value = 'A message not sent yet';
		wait(5 * MIN);
		assert.equal(isOn(), false);
		assert.deepEqual(watch.status(), { state: 'held', reason: 'typing' });
		box.value = '';
		wait(MIN - 1_000);
		assert.equal(isOn(), false);
		wait(1_000);
		assert.equal(isOn(), true);
	});

	it('holds off while a dialog is open', () => {
		const d = document.createElement('div');
		d.setAttribute('role', 'dialog');
		document.body.append(d);
		wait(5 * MIN);
		assert.equal(isOn(), false);
		assert.deepEqual(watch.status(), { state: 'held', reason: 'dialog' });
	});

	it('closes on a key press, and keeps the key from the page', () => {
		wait(MIN);
		wait(GRACE_MS);
		let reached = 0;
		document.addEventListener('keydown', () => reached++);
		const e = fire('keydown', { key: 'Enter' }, document.body);
		assert.equal(isOn(), false);
		assert.equal(e.defaultPrevented, true);
		assert.equal(reached, 0);
		// It counts afresh from the key.
		assert.deepEqual(watch.status(), { state: 'counting', leftMs: MIN });
	});

	it('closes on a click, swallowing that click and the rest of it', () => {
		wait(MIN);
		wait(GRACE_MS);
		const button = document.createElement('button');
		let pressed = 0;
		button.addEventListener('click', () => pressed++);
		button.addEventListener('pointerup', () => pressed++);
		document.body.append(button);
		fire('pointerdown', {}, button);
		assert.equal(isOn(), false);
		fire('pointerup', {}, button);
		fire('click', {}, button);
		assert.equal(pressed, 0);
		// Once the click is over, the page takes clicks again.
		t += SWALLOW_MS;
		fire('click', {}, button);
		assert.equal(pressed, 1);
	});

	it('closes on a real mouse move, not a jiggle of a few pixels', () => {
		wait(MIN);
		wait(GRACE_MS);
		fire('pointermove', { clientX: 100, clientY: 100 });
		fire('pointermove', { clientX: 102, clientY: 101 });
		assert.equal(isOn(), true);
		fire('pointermove', { clientX: 130, clientY: 100 });
		assert.equal(isOn(), false);
	});

	it('closes on a scroll of the wheel', () => {
		wait(MIN);
		wait(GRACE_MS);
		fire('wheel');
		assert.equal(isOn(), false);
	});

	it('ignores input just after it opens, so the click that opened it does not close it', () => {
		watch.show();
		t += GRACE_MS / 2;
		fire('pointermove', { clientX: 0, clientY: 0 });
		fire('pointermove', { clientX: 300, clientY: 300 });
		fire('keydown');
		assert.equal(isOn(), true);
	});

	it('closes when the tab goes to the background', () => {
		wait(MIN);
		Object.defineProperty(document, 'hidden', { value: true, configurable: true });
		document.dispatchEvent(new window.Event('visibilitychange'));
		assert.equal(isOn(), false);
		wait(5 * MIN);
		assert.equal(isOn(), false);
		assert.deepEqual(watch.status(), { state: 'held', reason: 'hidden' });
		delete (/** @type {any} */ (document).hidden);
	});

	it('shows the branded card with the fleet line on the Wheelhouse scene', () => {
		watch.configure({
			settings: { timeout: '1', scene: 'wheelhouse' },
			fleet: { underWay: 4, needYou: 0 }
		});
		watch.show();
		const card = document.querySelector('[data-screensaver]')?.shadowRoot?.querySelector('.card');
		assert.ok(card?.classList.contains('show'));
		assert.match(card?.textContent ?? '', /All quiet on deck/);
		assert.match(card?.textContent ?? '', /4 under way/);
		assert.match(card?.textContent ?? '', /0 need you/);
	});

	it('shows no card on the calm scenes', () => {
		watch.show();
		const card = document.querySelector('[data-screensaver]')?.shadowRoot?.querySelector('.card');
		assert.equal(card?.classList.contains('show'), false);
		assert.equal(card?.textContent, '');
	});

	it('tells the pill only when what it shows changes', () => {
		changes.length = 0;
		wait(100);
		wait(100);
		assert.equal(changes.length, 0);
		wait(1_000);
		assert.equal(changes.length, 1);
	});

	it('takes the screensaver and its listeners down when destroyed', () => {
		watch.show();
		watch.destroy();
		assert.equal(document.querySelector('[data-screensaver]'), null);
		start();
	});
});
