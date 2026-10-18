import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { THEMES } from '../src/themes.ts';

const root = new URL('../', import.meta.url);
const files = (dir: string) => readdirSync(new URL(dir, root)).filter((file) => !file.startsWith('.'));

describe('background images', () => {
	it('every theme has a source and all generated sizes', () => {
		for (const { id } of THEMES) {
			const sources = [`assets/backgrounds/${id}.jpg`, `assets/backgrounds/${id}.webp`].filter((path) =>
				existsSync(new URL(path, root)),
			);
			assert.equal(sources.length, 1, `${id}: exactly one source in assets/backgrounds`);
			for (const path of [
				`public/static/img/bg/${id}-lg.webp`,
				`public/static/img/bg/${id}-sm.webp`,
				`public/static/img/thumb/${id}.webp`,
			])
				assert.ok(existsSync(new URL(path, root)), `${id}: ${path} is missing (npm run images)`);
		}
	});

	it('has no images without a theme', () => {
		const ids = new Set(THEMES.map((t) => t.id));
		const orphans = [
			...files('assets/backgrounds/').map((file) => [file, file.replace(/\.(jpg|webp)$/, '')]),
			...files('public/static/img/bg/').map((file) => [file, file.replace(/-(lg|sm)\.webp$/, '')]),
			...files('public/static/img/thumb/').map((file) => [file, file.replace(/\.webp$/, '')]),
		]
			.filter(([, id]) => !ids.has(id as string))
			.map(([file]) => file);
		assert.deepEqual(orphans, [], 'images that no theme in src/themes.ts uses');
	});
});
