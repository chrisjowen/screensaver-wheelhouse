import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { Window } from 'happy-dom';

import { busyReason, clock, remainingMs } from '../wheelhouse/ui/idle.js';

const window = new Window({ url: 'http://127.0.0.1:4310/' });
const document = window.document;
after(() => window.happyDOM.close());

describe('remainingMs', () => {
	it('counts down from the last activity', () => {
		assert.equal(remainingMs(1_000, 1_000, 60_000), 60_000);
		assert.equal(remainingMs(1_000, 31_000, 60_000), 30_000);
		assert.equal(remainingMs(1_000, 99_000, 60_000), 0);
	});

	it('is null when it never starts by itself', () => {
		assert.equal(remainingMs(0, 10, null), null);
	});
});

describe('clock', () => {
	it('reads as minutes and seconds, rounding up', () => {
		assert.equal(clock(300_000), '5:00');
		assert.equal(clock(299_001), '5:00');
		assert.equal(clock(7_000), '0:07');
		assert.equal(clock(0), '0:00');
		assert.equal(clock(3_600_000), '1:00:00');
	});
});

describe('busyReason', () => {
	beforeEach(() => document.body.replaceChildren());

	it('is nothing on a quiet page', () => {
		assert.equal(busyReason(/** @type {any} */ (document)), null);
	});

	it('holds while a focused box has text in it, and not while it is empty', () => {
		const box = document.createElement('textarea');
		document.body.append(box);
		box.focus();
		assert.equal(busyReason(/** @type {any} */ (document)), null);
		box.value = 'Half a message';
		assert.equal(busyReason(/** @type {any} */ (document)), 'typing');
		box.blur();
		assert.equal(busyReason(/** @type {any} */ (document)), null);
	});

	it('holds while a text field has text, but not for a checkbox', () => {
		const input = document.createElement('input');
		input.value = 'search terms';
		document.body.append(input);
		input.focus();
		assert.equal(busyReason(/** @type {any} */ (document)), 'typing');
		input.type = 'checkbox';
		assert.equal(busyReason(/** @type {any} */ (document)), null);
	});

	it('holds while a dialog is open, but not a hidden one', () => {
		const d = document.createElement('div');
		d.setAttribute('role', 'dialog');
		document.body.append(d);
		assert.equal(busyReason(/** @type {any} */ (document)), 'dialog');
		d.hidden = true;
		assert.equal(busyReason(/** @type {any} */ (document)), null);
		const native = document.createElement('dialog');
		native.setAttribute('open', '');
		document.body.append(native);
		assert.equal(busyReason(/** @type {any} */ (document)), 'dialog');
	});

	it('holds while Wheelhouse dictates or a Live discussion is on', () => {
		const mic = document.createElement('button');
		mic.setAttribute('data-dictating', '');
		document.body.append(mic);
		assert.equal(busyReason(/** @type {any} */ (document)), 'recording');
		mic.remove();
		const bar = document.createElement('div');
		bar.setAttribute('data-live-bar', '');
		document.body.append(bar);
		assert.equal(busyReason(/** @type {any} */ (document)), 'live');
	});

	it('holds while a video plays', () => {
		const v = document.createElement('video');
		document.body.append(v);
		assert.equal(busyReason(/** @type {any} */ (document)), null);
		Object.defineProperty(v, 'paused', { value: false });
		assert.equal(busyReason(/** @type {any} */ (document)), 'playing');
	});
});
