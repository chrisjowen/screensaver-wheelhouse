import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULTS, idleMs, readSettings } from '../wheelhouse/ui/settings.js';

describe('readSettings', () => {
	it('fills in the decided defaults: dusk sea, a sloop, 5 minutes, no sound', () => {
		assert.deepEqual(readSettings(undefined), {
			timeout: '5',
			scene: 'dusk',
			boat: 'sloop',
			sound: false,
			volume: 40
		});
		assert.deepEqual(readSettings(null), { ...DEFAULTS });
		assert.deepEqual(readSettings('nonsense'), { ...DEFAULTS });
	});

	it('keeps each choice the manifest offers', () => {
		assert.deepEqual(
			readSettings({ timeout: '15', scene: 'wheelhouse', boat: 'paper', sound: true, volume: 70 }),
			{ timeout: '15', scene: 'wheelhouse', boat: 'paper', sound: true, volume: 70 }
		);
		assert.equal(readSettings({ timeout: 'never' }).timeout, 'never');
	});

	it('takes an option by its label, as install --setting does', () => {
		const s = readSettings({ timeout: '10 minutes', scene: 'Starry night', boat: ' schooner ' });
		assert.equal(s.timeout, '10');
		assert.equal(s.scene, 'night');
		assert.equal(s.boat, 'schooner');
	});

	it('takes a timeout given as a number of minutes', () => {
		assert.equal(readSettings({ timeout: 30 }).timeout, '30');
	});

	it('falls back to the default for anything it does not know', () => {
		const s = readSettings({
			timeout: '3',
			scene: 'desert',
			boat: 7,
			sound: 'maybe',
			volume: 'loud'
		});
		assert.deepEqual(s, { ...DEFAULTS });
	});

	it('reads yes or no written as text', () => {
		assert.equal(readSettings({ sound: 'yes' }).sound, true);
		assert.equal(readSettings({ sound: 'No' }).sound, false);
	});

	it('holds the volume between 0 and 100, rounded', () => {
		assert.equal(readSettings({ volume: 150 }).volume, 100);
		assert.equal(readSettings({ volume: -4 }).volume, 0);
		assert.equal(readSettings({ volume: '62.6' }).volume, 63);
		assert.equal(readSettings({ volume: '' }).volume, 40);
		assert.equal(readSettings({ volume: Infinity }).volume, 40);
	});
});

describe('idleMs', () => {
	it('is the timeout in milliseconds', () => {
		assert.equal(idleMs('1'), 60_000);
		assert.equal(idleMs('5'), 300_000);
		assert.equal(idleMs('60'), 3_600_000);
	});

	it('is null when it never starts by itself', () => {
		assert.equal(idleMs('never'), null);
	});

	it('uses the default for a timeout it does not know', () => {
		assert.equal(idleMs('7'), 300_000);
	});
});
