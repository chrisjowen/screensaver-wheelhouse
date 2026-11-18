import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

import plugin, { fleetLine, readView } from '../wheelhouse/server/index.js';
import { BOATS, DEFAULTS, SCENES, TIMEOUTS } from '../wheelhouse/ui/settings.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('.wheelhouse-plugin/plugin.json', root), 'utf8'));
// A copy of the SDK's packages/plugin-sdk/plugin.schema.json, so the tests run offline.
const schema = JSON.parse(readFileSync(new URL('tests/fixtures/plugin.schema.json', root), 'utf8'));

describe('the manifest', () => {
	it('follows the Wheelhouse plugin schema', () => {
		const ajv = new Ajv2020({ allErrors: true, strict: false });
		const valid = ajv.validate(schema, manifest);
		assert.ok(valid, JSON.stringify(ajv.errors, null, 2));
	});

	it('is off until the captain turns it on', () => {
		assert.equal(manifest.wheelhouse.enabledByDefault, false);
	});

	it('names entries that exist', () => {
		assert.ok(existsSync(new URL(manifest.wheelhouse.server, root)));
		assert.ok(existsSync(new URL(manifest.wheelhouse.ui, root)));
	});

	it('lists exactly what the server entry contributes', () => {
		assert.deepEqual(
			plugin.contributions.map((c) => ({ id: c.id, slot: c.slot })),
			manifest.wheelhouse.contributions
		);
		assert.deepEqual(manifest.wheelhouse.services, []);
		assert.equal(plugin.services, undefined);
	});

	it('draws the header with an element named after the plugin', () => {
		for (const c of plugin.contributions) {
			assert.ok(c.render.element.startsWith(`${manifest.name}-`));
			assert.ok(plugin.providers.some((p) => p.id === c.provider));
		}
	});

	it('declares every setting the plugin reads, with the same defaults', () => {
		const declared = Object.fromEntries(
			Object.entries(manifest.wheelhouse.settings).map(([k, v]) => [k, v.default])
		);
		assert.deepEqual(declared, { ...DEFAULTS });
	});

	it('offers the same choices the plugin reads', () => {
		const s = manifest.wheelhouse.settings;
		assert.deepEqual(s.timeout.options, TIMEOUTS);
		assert.deepEqual(s.scene.options, SCENES);
		assert.deepEqual(s.boat.options, BOATS);
	});

	it('agrees with package.json on the version', () => {
		const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
		assert.equal(manifest.version, pkg.version);
	});
});

describe('the provider', () => {
	const task = (over = {}) => ({
		id: 't',
		status: 'working',
		attention: null,
		mergedAt: null,
		...over
	});

	it('hands the page the settings and the fleet line', async () => {
		const r = await plugin.providers[0].fetch({
			settings: { scene: 'wheelhouse', sound: true },
			tasks: [task(), task({ attention: { owner: 'captain' } }), task({ status: 'landed' })]
		});
		assert.equal(r.available, true);
		assert.deepEqual(r.value, {
			settings: { ...DEFAULTS, scene: 'wheelhouse', sound: true },
			fleet: { underWay: 2, needYou: 1 }
		});
		// Plain JSON, as Wheelhouse asks of provider values.
		assert.deepEqual(JSON.parse(JSON.stringify(r.value)), r.value);
	});

	it('counts nothing that is over, and survives odd tasks', () => {
		assert.deepEqual(
			fleetLine([task({ status: 'done' }), task({ mergedAt: '2026-11-01' }), null, 'x']),
			{ underWay: 0, needYou: 0 }
		);
		assert.deepEqual(fleetLine(undefined), { underWay: 0, needYou: 0 });
		assert.deepEqual(readView({}).settings, { ...DEFAULTS });
	});
});
