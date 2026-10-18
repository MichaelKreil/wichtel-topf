import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draw, isDrawPossible } from '../src/draw.ts';

function assertValid(n: number, result: number[] | null, isAllowed: (g: number, r: number) => boolean = () => true) {
	assert.ok(result, 'expected an assignment');
	assert.equal(result.length, n);
	assert.deepEqual(
		[...result].sort((a, b) => a - b),
		Array.from({ length: n }, (_, i) => i),
		'must be a permutation',
	);
	result.forEach((receiver, giver) => {
		assert.notEqual(receiver, giver, 'nobody draws themselves');
		assert.ok(isAllowed(giver, receiver), `${giver}→${receiver} is excluded`);
	});
}

function cycleCount(result: number[]): number {
	const seen = new Set<number>();
	let cycles = 0;
	for (let start = 0; start < result.length; start++) {
		if (seen.has(start)) continue;
		cycles++;
		for (let i = start; !seen.has(i); i = result[i] as number) seen.add(i);
	}
	return cycles;
}

/** A small seeded random generator, so failures can be reproduced. */
function seededRandom(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
	};
}

/** Random exclusions like the admin page creates them: a pair may not draw each other in either direction. */
function randomExclusions(n: number, share: number, random: () => number) {
	const forbidden = new Set<string>();
	for (let a = 0; a < n; a++)
		for (let b = a + 1; b < n; b++) if (random() < share) forbidden.add(`${a}>${b}`).add(`${b}>${a}`);
	return (giver: number, receiver: number) => !forbidden.has(`${giver}>${receiver}`);
}

/** Brute force: is there any assignment at all? */
function anyAssignment(n: number, isAllowed: (g: number, r: number) => boolean): boolean {
	const used = new Array<boolean>(n).fill(false);
	const extend = (giver: number): boolean => {
		if (giver === n) return true;
		for (let receiver = 0; receiver < n; receiver++) {
			if (used[receiver] || receiver === giver || !isAllowed(giver, receiver)) continue;
			used[receiver] = true;
			if (extend(giver + 1)) return true;
			used[receiver] = false;
		}
		return false;
	};
	return extend(0);
}

describe('draw', () => {
	it('returns null for fewer than two participants', () => {
		assert.equal(draw(0), null);
		assert.equal(draw(1), null);
	});

	it('produces a single circle without exclusions', () => {
		for (let n = 2; n <= 40; n++) {
			const result = draw(n);
			assertValid(n, result);
			assert.equal(cycleCount(result as number[]), 1);
		}
	});

	it('respects exclusions', () => {
		// couples (0,1), (2,3), (4,5) must not draw each other
		const isAllowed = (g: number, r: number) => Math.floor(g / 2) !== Math.floor(r / 2);
		for (let i = 0; i < 200; i++) assertValid(6, draw(6, isAllowed), isAllowed);
	});

	it('falls back to several circles when a single circle is impossible', () => {
		// 0 and 1 may only draw each other; 2, 3, 4 may only draw among themselves
		const group = (x: number) => (x < 2 ? 0 : 1);
		const isAllowed = (g: number, r: number) => group(g) === group(r);
		const result = draw(5, isAllowed);
		assertValid(5, result, isAllowed);
		assert.equal(cycleCount(result as number[]), 2);
	});

	it('returns null when impossible', () => {
		// 0 is excluded from everyone
		const isAllowed = (g: number, r: number) => g !== 0 && r !== 0;
		assert.equal(draw(4, isAllowed), null);
		assert.equal(isDrawPossible(4, isAllowed), false);
	});

	it('is roughly uniform', () => {
		// for n=4 there are 3! = 6 circles
		const counts = new Map<string, number>();
		for (let i = 0; i < 6000; i++) {
			const key = (draw(4) as number[]).join();
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		assert.equal(counts.size, 6);
		for (const count of counts.values()) assert.ok(count > 800 && count < 1200, `count ${count}`);
	});

	it('finds an assignment exactly when one exists (random exclusions, small pots)', () => {
		const random = seededRandom(1);
		for (let i = 0; i < 2000; i++) {
			const n = 2 + Math.floor(random() * 7);
			const isAllowed = randomExclusions(n, random() * 0.7, random);
			const possible = anyAssignment(n, isAllowed);
			assert.equal(isDrawPossible(n, isAllowed), possible, `case ${i}: isDrawPossible`);
			const result = draw(n, isAllowed);
			if (possible) assertValid(n, result, isAllowed);
			else assert.equal(result, null, `case ${i}: draw must fail`);
		}
	});

	it('gives valid results and stays fast for large pots (random exclusions)', () => {
		// Cloudflare allows 10 ms of CPU per request; the biggest code name list has 89 names
		const random = seededRandom(2);
		let slowest = 0;
		for (let i = 0; i < 300; i++) {
			const n = 10 + Math.floor(random() * 80);
			const isAllowed = randomExclusions(n, random() * 0.5, random);
			const start = performance.now();
			const result = draw(n, isAllowed);
			const possible = isDrawPossible(n, isAllowed);
			slowest = Math.max(slowest, performance.now() - start);
			assert.equal(result !== null, possible, `case ${i}`);
			if (result) assertValid(n, result, isAllowed);
		}
		assert.ok(slowest < 50, `slowest draw took ${slowest.toFixed(1)} ms`);
	});
});
