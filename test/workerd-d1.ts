// The real D1 of Cloudflare's runtime (workerd), started locally by wrangler with an in-memory database.
// Catches differences that the stand-in in fake-d1.ts can't show (SQL dialect, batches, limits).
import { readdirSync, readFileSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';
import type { D1Binding } from '../src/db-d1.ts';

let proxy: Awaited<ReturnType<typeof getPlatformProxy>> | undefined;
let db: D1Binding | undefined;

/** The local D1 binding with empty tables; the runtime starts on first use. */
export async function workerdD1(): Promise<D1Binding> {
	if (!db) {
		proxy = await getPlatformProxy({ persist: false });
		db = (proxy.env as { DB: D1Binding }).DB;
		const dir = new URL('../migrations/', import.meta.url);
		for (const file of readdirSync(dir).sort()) {
			const statements = readFileSync(new URL(file, dir), 'utf8')
				.replace(/--.*$/gm, '')
				.split(';')
				.map((s) => s.trim())
				.filter(Boolean);
			await db.batch(statements.map((s) => db?.prepare(s) as ReturnType<D1Binding['prepare']>));
		}
	}
	// every test starts empty (children first, because of the foreign keys)
	await db.batch(
		['exclusions', 'participants', 'pots'].map(
			(table) => db?.prepare(`DELETE FROM ${table}`) as ReturnType<D1Binding['prepare']>,
		),
	);
	return db;
}

export async function stopWorkerd(): Promise<void> {
	await proxy?.dispose();
	proxy = undefined;
	db = undefined;
}
