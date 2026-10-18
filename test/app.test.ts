import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it } from 'node:test';
import type { Hono } from 'hono';
import { assetVersion } from '../scripts/lib/assets.ts';
import { createApp } from '../src/app.ts';
import { ASSET_VERSION } from '../src/asset-version.ts';
import { codeNamesFor, DEFAULT_LIST_ID, getCodeNameList } from '../src/codenames.ts';

import { NodeDatabase } from '../src/db-node.ts';
import { memoryRateLimiter } from '../src/rate-limit.ts';
import { Store } from '../src/store.ts';
import { TAGS, THEMES, themesCss } from '../src/themes.ts';
import { FILTER_FROM } from '../src/views/result.ts';

const BASE = 'http://localhost';
let app: Hono;
let store: Store;

beforeEach(() => {
	store = new Store(new NodeDatabase(':memory:'), codeNamesFor);
	app = createApp({ store });
});

function post(path: string, form: Record<string, string>, headers: Record<string, string> = {}) {
	return app.request(`${BASE}${path}`, {
		method: 'POST',
		body: new URLSearchParams(form),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE, Host: 'localhost', ...headers },
	});
}

function get(path: string, headers: Record<string, string> = {}) {
	return app.request(`${BASE}${path}`, { headers: { Host: 'localhost', ...headers } });
}

async function createPot(): Promise<{ potPath: string; adminPath: string }> {
	const res = await post('/neu', { theme: 'candle' });
	assert.equal(res.status, 303);
	const adminPath = new URL(res.headers.get('location') ?? '', BASE).pathname;
	const potPath = adminPath.replace(/\/admin\/.*/, '');
	return { potPath, adminPath };
}

/** Joins and follows the redirect to the personal page. */
async function join(potPath: string, name: string) {
	const res = await post(potPath, { name });
	const location = res.headers.get('location');
	const personalPath = location ? new URL(location, BASE).pathname : '';
	const html = location ? await (await get(location)).text() : await res.text();
	return { res, html, personalPath, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' };
}

describe('app', () => {
	it('serves the start page and static files', async () => {
		const res = await get('/');
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Wichteltopf anlegen/);
		assert.match(res.headers.get('content-security-policy') ?? '', /default-src 'self'/);
		assert.equal((await get('/healthz')).status, 200);
	});

	it('runs the full flow', async () => {
		const { potPath, adminPath } = await createPot();

		const admin = await (await get(`${adminPath}?neu`)).text();
		assert.match(admin, /Wichteltopf angelegt/);
		assert.match(admin, /data-theme="candle"/);
		assert.ok(admin.includes(`http://localhost${potPath}`));
		// the secret admin link is marked, the group link isn't
		assert.match(admin, /<div class="copy secret">\s*<label><span class="lock"[^>]*>🔒<\/span> Admin-Link/);
		assert.match(admin, /<div class="copy">\s*<label>Teilnahme-Link/);

		const anna = await join(potPath, 'Anna');
		assert.equal(anna.res.status, 303);
		assert.match(anna.personalPath, new RegExp(`^${potPath}/ich/[a-z0-9]{24}$`));
		assert.match(anna.html, /Schön, dass du mitmachst/);
		assert.match(anna.html, /Merke dir deinen geheimen Codenamen:/);
		assert.match(anna.html, /<span class="tag-value important">/, 'the code name is written in red ink');
		assert.ok(anna.html.includes(`http://localhost${anna.personalPath}`));
		// the personal link is for bookmarking, not for sharing with others
		assert.match(anna.html, /Setz dir ein Lesezeichen/);
		assert.doesNotMatch(anna.html, /data-share/);
		assert.match(
			anna.html,
			/<div class="copy secret">\s*<label><span class="lock"[^>]*>🔒<\/span> Adresse dieser Seite/,
		);
		assert.ok(anna.html.includes(`href="mailto:?subject=Mein%20Wichtel-Link&amp;body=`), 'mail to self');
		assert.ok(anna.html.includes(encodeURIComponent(`http://localhost${anna.personalPath}`)), 'link in mail');
		assert.match(anna.cookie, /^wichtel_/);

		// returning with the cookie: the pot page knows Anna, but doesn't redirect (shared devices)
		const back = await get(potPath, { Cookie: anna.cookie });
		assert.equal(back.status, 200);
		const backHtml = await back.text();
		assert.match(backHtml, /<h2>Du bist als Anna dabei<\/h2>/);
		assert.ok(backHtml.includes(`href="${anna.personalPath}"`));
		assert.ok(!backHtml.includes('name="name"'), 'no join form while the browser knows a participant');

		// somebody else on the same device: the browser forgets Anna, who keeps her personal link
		const forget = await post(`${potPath}/wechseln`, {}, { Cookie: anna.cookie });
		assert.equal(forget.status, 303);
		assert.match(forget.headers.get('set-cookie') ?? '', /Max-Age=0/);
		assert.match(await (await get(potPath)).text(), /name="name"/);
		assert.equal((await get(anna.personalPath)).status, 200);

		// the personal link works without the cookie (other device) and remembers the browser
		const elsewhere = await get(anna.personalPath);
		assert.match(await elsewhere.text(), /Du bist als <b>Anna<\/b> im Topf/);
		assert.match(elsewhere.headers.get('set-cookie') ?? '', /^wichtel_/);
		assert.equal((await get(`${potPath}/ich/wrongtoken`)).status, 404);

		// duplicate names are rejected
		assert.equal((await join(potPath, 'anna')).res.status, 400);

		// names are escaped
		const xss = await join(potPath, '<script>alert(1)</script>');
		assert.ok(!xss.html.includes('<script>alert'));
		assert.ok((await (await get(potPath)).text()).includes('&lt;script&gt;'));

		await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		// the names of the people in the pot are written by hand
		assert.match(
			await (await get(potPath)).text(),
			/<span class="hand">&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/span>, <span class="hand">Anna<\/span>, <span class="hand">Ben<\/span> und <span class="hand">Carla<\/span> machen bereits mit\./,
		);

		// the admin joins like everyone else
		assert.ok(admin.includes(`<a class="button secondary" href="http://localhost${potPath}">Selbst mitmachen</a>`));

		const closed = await post(`${adminPath}/schliessen`, {});
		assert.equal(closed.status, 303);

		// after the draw, the admin is told to send the group link around again
		const adminResult = await (await get(adminPath)).text();
		assert.match(adminResult, /Sag jetzt allen Bescheid/);
		assert.match(adminResult, /data-share="Die Auslosung ist fertig![^"]*"/);
		assert.doesNotMatch(adminResult, /Selbst mitmachen/);

		const result = await (await get(anna.personalPath)).text();
		assert.match(result, /Die Ziehung ist abgeschlossen/);
		assert.match(result, /Du beschenkst/);
		assert.equal(result.match(/<td>/g)?.length, 8, 'a note with one row per participant');
		assert.equal(result.match(/<mark>/g)?.length, 2, 'the own row is highlighted');

		const publicResult = await (await get(potPath)).text();
		assert.ok(!publicResult.includes('Du beschenkst'));
		assert.equal(publicResult.match(/<td>/g)?.length, 8);
		assert.ok(!publicResult.includes('<mark>'));
		assert.ok(!publicResult.includes('Du bist als'));

		// with the cookie, the result page offers the own result, but shows the list to everyone
		const knownResult = await (await get(potPath, { Cookie: anna.cookie })).text();
		assert.match(knownResult, /Du bist als <b>Anna<\/b> dabei/);
		assert.ok(knownResult.includes(`href="${anna.personalPath}"`));
		assert.equal(knownResult.match(/<td>/g)?.length, 8);

		// no more joining
		assert.equal((await join(potPath, 'Dora')).res.status, 303);
	});

	it('lets the admin remove participants and add exclusions', async () => {
		const { potPath, adminPath } = await createPot();
		for (const name of ['Anna', 'Ben', 'Carla']) await join(potPath, name);
		const [anna, ben] = await store.listParticipants(potPath.slice(1));
		assert.ok(anna && ben);

		await post(`${adminPath}/ausschluss`, { a: String(anna.id), b: String(ben.id) });
		let html = await (await get(adminPath)).text();
		assert.match(html, /Anna ⟷ Ben/);
		assert.match(html, /keine Auslosung möglich/);
		assert.equal((await post(`${adminPath}/schliessen`, {})).status, 400);

		await post(`${adminPath}/entfernen`, { participant: String(anna.id) });
		html = await (await get(adminPath)).text();
		assert.ok(!html.includes('<span>Anna</span>'));
		assert.ok(!html.includes('⟷ Ben'));
	});

	it('hides pots and admin pages behind valid ids and tokens', async () => {
		const { potPath, adminPath } = await createPot();
		assert.equal((await get('/Unknown-abcdefgh')).status, 404);
		assert.equal((await get(`${potPath}/admin/wrongtoken`)).status, 404);
		assert.equal((await post(`${potPath}/admin/wrongtoken/schliessen`, {})).status, 404);
		assert.equal((await get(adminPath)).status, 200);
	});

	it('rejects cross-site form posts', async () => {
		const { potPath, adminPath } = await createPot();
		assert.equal((await post(potPath, { name: 'Mallory' }, { Origin: 'https://evil.example' })).status, 403);
		// Sec-Fetch-Site wins over a matching Origin
		assert.equal((await post(potPath, { name: 'Mallory' }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
		assert.equal((await post(potPath, { name: 'Anna' }, { 'Sec-Fetch-Site': 'same-origin' })).status, 303);
		// neither header, and no form body
		const bare = await app.request(`${BASE}${adminPath}/schliessen`, {
			method: 'POST',
			headers: { Host: 'localhost' },
		});
		assert.equal(bare.status, 403);
	});
});

describe('rate limiting', () => {
	it('rejects too many form submissions per IP', async () => {
		const store = new Store(new NodeDatabase(':memory:'), codeNamesFor);
		const rateLimiters = { create: memoryRateLimiter(2, 60_000), write: memoryRateLimiter(30, 60_000) };
		const app = createApp({ store, rateLimiters, clientIp: (c) => c.req.header('cf-connecting-ip') ?? '' });
		const create = (ip: string) =>
			app.request(`${BASE}/neu`, {
				method: 'POST',
				body: new URLSearchParams({ theme: 'tree1' }),
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE, 'cf-connecting-ip': ip },
			});
		assert.equal((await create('1.1.1.1')).status, 303);
		assert.equal((await create('1.1.1.1')).status, 303);
		assert.equal((await create('1.1.1.1')).status, 429);
		assert.equal((await create('2.2.2.2')).status, 303);
	});

	it('resets after the period', async () => {
		let now = 0;
		const limiter = memoryRateLimiter(1, 1000, () => now);
		assert.ok(await limiter('a'));
		assert.ok(!(await limiter('a')));
		now = 1000;
		assert.ok(await limiter('a'));
	});
});

describe('errors and caching', () => {
	it('marks pages as not cacheable', async () => {
		const res = await get('/');
		assert.equal(res.headers.get('cache-control'), 'no-store');
		const { adminPath } = await createPot();
		assert.equal((await get(adminPath)).headers.get('cache-control'), 'no-store');
	});

	it('shows a friendly page on unexpected errors', async (t) => {
		t.mock.method(console, 'error', () => {});
		const failing = new Store(
			{
				all: () => Promise.reject(new Error('db down')),
				first: () => Promise.reject(new Error('db down')),
				batch: () => Promise.reject(new Error('db down')),
			},
			codeNamesFor,
		);
		const res = await createApp({ store: failing }).request(`${BASE}/SomePot-abcdefgh`);
		assert.equal(res.status, 500);
		assert.match(await res.text(), /Da ist etwas schiefgelaufen/);
		assert.equal(res.headers.get('cache-control'), 'no-store');
	});
});

describe('link previews', () => {
	it('has preview tags, and only the start page may be indexed', async () => {
		const start = await (await get('/')).text();
		assert.ok(start.includes('<meta property="og:image" content="http://localhost/static/og.jpg">'));
		assert.ok(!start.includes('noindex'));

		const { potPath } = await createPot();
		const pot = await (await get(potPath)).text();
		assert.ok(pot.includes('<meta property="og:title" content="Mach mit beim Wichteln!">'));
		assert.ok(pot.includes('<meta name="robots" content="noindex">'));
	});
});

describe('generated assets (run `npm run assets` after changes)', () => {
	it('themes.css is up to date with src/themes.ts', () => {
		const file = readFileSync(new URL('../public/static/themes.css', import.meta.url), 'utf8');
		assert.equal(file, `${themesCss()}\n`);
	});

	it('the asset version matches style.css, app.js and themes.css', () => {
		assert.equal(ASSET_VERSION, assetVersion());
	});

	it('pages link CSS and JS with the version', async () => {
		const html = await (await get('/')).text();
		assert.ok(html.includes(`/static/style.css?v=${ASSET_VERSION}`));
		assert.ok(html.includes(`/static/app.js?v=${ASSET_VERSION}`));
	});
});

describe('admin links by mail', () => {
	it('offers a mailto link containing both links', async () => {
		const { potPath, adminPath } = await createPot();
		const html = await (await get(adminPath)).text();
		const href = html.match(/href="(mailto:[^"]+)"/)?.[1]?.replaceAll('&amp;', '&') ?? '';
		const body = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body') ?? '';
		assert.ok(body.includes(`http://localhost${potPath}\n`));
		assert.ok(body.includes(`http://localhost${adminPath}\n`));
	});
});

describe('deleting data', () => {
	it('lets the admin delete the whole pot', async () => {
		const { potPath, adminPath } = await createPot();
		await join(potPath, 'Anna');
		const res = await post(`${adminPath}/loeschen`, {});
		assert.equal(res.status, 200);
		assert.match(await res.text(), /Topf gelöscht/);
		assert.equal((await get(potPath)).status, 404);
		assert.equal(await store.getPot(potPath.slice(1)), undefined);
	});

	it('lets participants remove themselves until the draw', async () => {
		const { potPath, adminPath } = await createPot();
		const anna = await join(potPath, 'Anna');
		const res = await post(`${anna.personalPath}/austragen`, {});
		assert.match(await res.text(), /Du bist ausgetragen/);
		assert.match(res.headers.get('set-cookie') ?? '', /Max-Age=0/);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 0);
		assert.equal((await get(anna.personalPath)).status, 404);

		// not after the draw
		const ben = await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		await join(potPath, 'Dora');
		await post(`${adminPath}/schliessen`, {});
		assert.equal((await post(`${ben.personalPath}/austragen`, {})).status, 303);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 3);
	});
});

describe('security', () => {
	/** All kinds of pages, as different people see them. */
	async function allPages() {
		const { potPath, adminPath } = await createPot();
		const anna = await join(potPath, 'Anna');
		await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		const open = {
			start: await get('/'),
			pot: await get(potPath),
			personal: await get(anna.personalPath),
			admin: await get(adminPath),
			privacy: await get('/datenschutz'),
			notFound: await get('/Unknown-abcdefgh'),
			rejected: await post(potPath, { name: 'X' }, { 'Sec-Fetch-Site': 'cross-site' }),
		};
		await post(`${adminPath}/schliessen`, {});
		const closed = {
			result: await get(potPath),
			personalResult: await get(anna.personalPath),
			adminResult: await get(adminPath),
		};
		return { ...open, ...closed };
	}

	it('sends security headers with every page', async () => {
		for (const [name, res] of Object.entries(await allPages())) {
			const csp = res.headers.get('content-security-policy') ?? '';
			for (const directive of [
				"default-src 'self'",
				"base-uri 'none'",
				"form-action 'self'",
				"frame-ancestors 'none'",
				"object-src 'none'",
			])
				assert.ok(csp.includes(directive), `${name}: CSP ${directive}`);
			assert.ok(!csp.includes('unsafe'), `${name}: no unsafe CSP sources`);
			assert.equal(res.headers.get('referrer-policy'), 'no-referrer', `${name}: referrer policy`);
			assert.equal(res.headers.get('x-content-type-options'), 'nosniff', `${name}: nosniff`);
			assert.equal(res.headers.get('cache-control'), 'no-store', `${name}: not cached`);
		}
	});

	it('has no inline scripts, event handlers or styles that the CSP would block', async () => {
		for (const [name, res] of Object.entries(await allPages())) {
			const html = await res.text();
			assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), `${name}: inline script`);
			assert.ok(!/\son[a-z]+=/i.test(html), `${name}: inline event handler`);
			assert.ok(!/\sstyle=/i.test(html), `${name}: inline style`);
		}
	});

	it('sets the participant cookie with safe flags', async () => {
		const { potPath } = await createPot();
		const cookie = (await post(potPath, { name: 'Anna' })).headers.get('set-cookie') ?? '';
		assert.match(cookie, /HttpOnly/);
		assert.match(cookie, /SameSite=Lax/);
		assert.match(cookie, /Path=\//);
		assert.match(cookie, /Max-Age=\d+/);
		assert.doesNotMatch(cookie, /Secure/, 'plain http in tests');

		const https = createApp({ store, baseUrl: 'https://wichteltopf.de' });
		const res = await https.request(`https://wichteltopf.de${potPath}`, {
			method: 'POST',
			body: new URLSearchParams({ name: 'Ben' }),
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Sec-Fetch-Site': 'same-origin' },
		});
		assert.match(res.headers.get('set-cookie') ?? '', /Secure/, 'https');
	});

	it('escapes names in text and attributes on every page', async () => {
		const evil = `"><img src=x onerror=alert(1)>'`;
		const { potPath, adminPath } = await createPot();
		const mallory = await join(potPath, evil);
		await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		const pages = [potPath, mallory.personalPath, adminPath];
		const check = async (path: string) => {
			const html = await (await get(path)).text();
			assert.ok(!html.includes('<img src=x'), `${path}: raw HTML`);
			assert.ok(!html.includes(`"><img`), `${path}: breaks out of an attribute`);
			assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), `${path}: the name is shown escaped`);
		};
		for (const path of pages) await check(path);
		await post(`${adminPath}/schliessen`, {});
		for (const path of pages) await check(path);
	});

	it('never shows secret links or code names to the wrong people', async () => {
		const { potPath, adminPath } = await createPot();
		const adminToken = adminPath.split('/').pop() as string;
		const anna = await join(potPath, 'Anna');
		const ben = await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		const annaToken = anna.personalPath.split('/').pop() as string;
		const benToken = ben.personalPath.split('/').pop() as string;
		const codeNames = (await store.listParticipants(potPath.slice(1))).map((p) => p.codeName);

		const potPage = await (await get(potPath)).text();
		for (const secret of [adminToken, annaToken, benToken, ...codeNames])
			assert.ok(!potPage.includes(secret), `pot page shows ${secret}`);
		const adminPage = await (await get(adminPath)).text();
		for (const secret of [annaToken, benToken, ...codeNames])
			assert.ok(!adminPage.includes(secret), `admin page shows ${secret}`);
		const annaPage = await (await get(anna.personalPath)).text();
		for (const secret of [adminToken, benToken]) assert.ok(!annaPage.includes(secret), `Anna's page shows ${secret}`);

		// after the draw, the code names appear, but still no secret links
		await post(`${adminPath}/schliessen`, {});
		const result = await (await get(potPath)).text();
		for (const secret of [adminToken, annaToken, benToken])
			assert.ok(!result.includes(secret), `result shows ${secret}`);
	});

	it('rejects oversized form submissions', async () => {
		const { potPath } = await createPot();
		const res = await post(potPath, { name: 'x'.repeat(20_000) });
		assert.equal(res.status, 413);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 0);
	});
});

describe('input validation', () => {
	it('treats uploaded files as missing names', async () => {
		const { potPath } = await createPot();
		const form = new FormData();
		form.append('name', new File(['x'], 'evil.txt'));
		const res = await app.request(`${BASE}${potPath}`, {
			method: 'POST',
			body: form,
			headers: { Origin: BASE, Host: 'localhost' },
		});
		assert.equal(res.status, 400);
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 0);
	});

	it('ignores invalid ids', async () => {
		const { potPath, adminPath } = await createPot();
		await join(potPath, 'Anna');
		for (const participant of ['abc', '1e3', '-1', '1.5', '']) {
			assert.equal((await post(`${adminPath}/entfernen`, { participant })).status, 303);
		}
		assert.equal((await store.listParticipants(potPath.slice(1))).length, 1);
	});
});

describe('privacy page', () => {
	it('is linked from every page', async () => {
		const res = await get('/datenschutz');
		assert.equal(res.status, 200);
		const html = await res.text();
		assert.match(html, /Datenschutzerklärung/);
		assert.match(html, /Gottschedstrasse 4<br>/);
		assert.ok(!html.includes('BITTE ERGÄNZEN'));
		assert.match(await (await get('/')).text(), /<a href="\/datenschutz">Impressum und Datenschutz<\/a>/);
		assert.match(await (await get('/Unknown-abcdefgh')).text(), /href="\/datenschutz"/);
	});
});

describe('code name lists', () => {
	it('shows each list with its capacity on the start page', async () => {
		const html = await (await get('/')).text();
		assert.match(html, /<b>Mittelerde<\/b> <span class="capacity">bis zu 43 Personen<\/span>/);
		assert.match(html, new RegExp(`value="${DEFAULT_LIST_ID}" checked`));
	});

	it('uses the chosen list for the pot', async () => {
		const res = await post('/neu', { theme: 'tree1', codenames: 'mittelerde' });
		const adminPath = new URL(res.headers.get('location') ?? '', BASE).pathname;
		const potPath = adminPath.replace(/\/admin\/.*/, '');
		const anna = await join(potPath, 'Anna');
		const codeName = anna.html.match(/Von:<\/span> <span class="tag-value[^"]*">([^<]+)<\/span>/)?.[1] ?? '';
		assert.ok(getCodeNameList('mittelerde')?.names.includes(codeName), codeName);
		assert.match(await (await get(adminPath)).text(), /Im Topf \(1 von max\. 43\)/);
	});

	it('falls back to the default list for unknown ids', async () => {
		const forms: Record<string, string>[] = [{ theme: 'tree1', codenames: 'nope' }, { theme: 'tree1' }];
		for (const form of forms) {
			const res = await post('/neu', form);
			const potId = new URL(res.headers.get('location') ?? '', BASE).pathname.split('/')[1] ?? '';
			assert.equal((await store.getPot(potId))?.codeNameList, DEFAULT_LIST_ID);
		}
	});
});

describe('deletion date', () => {
	it('tells when a pot is deleted, on the start page and on the admin page', async () => {
		// 2026-10-18 12:00 in Berlin; 90 days later is 2027-01-16
		const now = Date.UTC(2026, 9, 18, 10);
		const app = createApp({ store, now: () => now, potTtlDays: 90 });
		const start = await (await app.request(`${BASE}/`)).text();
		assert.match(start, /werbefrei, ohne Anmeldung und ohne E-Mail-Adresse/);
		assert.match(start, /90 Tage nach der letzten Änderung automatisch gelöscht, frühestens also am 16\.01\.2027\./);

		const pot = await new Store(new NodeDatabase(':memory:'), codeNamesFor, () => now).createPot('tree1', 'waldtiere');
		const stored = new Store(new NodeDatabase(':memory:'), codeNamesFor, () => now);
		const app2 = createApp({ store: stored, potTtlDays: 30 });
		const created = await stored.createPot('tree1', 'waldtiere');
		const admin = await (await app2.request(`${BASE}/${created.id}/admin/${created.adminToken}`)).text();
		assert.match(admin, /wird der Topf am 17\.11\.2026 automatisch gelöscht/);
		assert.ok(pot.updatedAt === now);
		assert.match(await (await app2.request(`${BASE}/datenschutz`)).text(), /30 Tage nach der letzten Änderung/);
	});
});

describe('result list filter', () => {
	it('offers a filter field only for long lists', async () => {
		const small = await createPot();
		for (const name of ['Anna', 'Ben', 'Carla']) await join(small.potPath, name);
		await post(`${small.adminPath}/schliessen`, {});
		assert.doesNotMatch(await (await get(small.potPath)).text(), /data-filter-rows/);

		const large = await createPot();
		for (let i = 0; i < FILTER_FROM; i++) await join(large.potPath, `Person ${i}`);
		await post(`${large.adminPath}/schliessen`, {});
		const html = await (await get(large.potPath)).text();
		assert.match(html, /<label class="filter" hidden>Codename suchen<input type="search" data-filter-rows/);
		assert.match(html, /data-filter-empty hidden/);
	});
});

describe('re-issued personal links', () => {
	it('lets the admin replace a lost link while the pot is open', async () => {
		const { potPath, adminPath } = await createPot();
		const anna = await join(potPath, 'Anna');
		const [stored] = await store.listParticipants(potPath.slice(1));
		assert.ok(stored);
		const oldToken = anna.personalPath.split('/').pop() as string;

		const res = await post(`${adminPath}/neuer-link`, { participant: String(stored.id) });
		assert.equal(res.status, 303);
		assert.equal(res.headers.get('location'), `${adminPath}?link=${stored.id}`);
		const [updated] = await store.listParticipants(potPath.slice(1));
		assert.ok(
			updated && updated.token !== oldToken && updated.codeName === stored.codeName,
			'new token, same code name',
		);

		// the new link is shown once, for handing over; the old link and the old cookie are dead
		const html = await (await get(`${adminPath}?link=${stored.id}`)).text();
		assert.match(html, /<h2>Neuer Link für Anna<\/h2>/);
		assert.ok(html.includes(`http://localhost${potPath}/ich/${updated.token}`));
		assert.ok(!html.includes(oldToken));
		assert.ok(!(await (await get(adminPath)).text()).includes(updated.token), 'not without the query');
		assert.equal((await get(anna.personalPath)).status, 404);
		assert.match(await (await get(potPath, { Cookie: anna.cookie })).text(), /name="name"/);
		assert.equal((await get(`${potPath}/ich/${updated.token}`)).status, 200);

		// unknown ids and closed pots change nothing
		assert.equal((await post(`${adminPath}/neuer-link`, { participant: '999' })).headers.get('location'), adminPath);
		await join(potPath, 'Ben');
		await join(potPath, 'Carla');
		await post(`${adminPath}/schliessen`, {});
		const closed = await post(`${adminPath}/neuer-link`, { participant: String(stored.id) });
		assert.equal(closed.headers.get('location'), adminPath);
		assert.equal((await store.listParticipants(potPath.slice(1)))[0]?.token, updated.token);
	});
});

describe('pot title', () => {
	it('shows the title on every page of the pot, in the tab and in link previews', async () => {
		const res = await post('/neu', { theme: 'tree1', title: '  Familie  Müller 2026 ' });
		const adminPath = new URL(res.headers.get('location') ?? '', BASE).pathname;
		const potPath = adminPath.replace(/\/admin\/.*/, '');
		const anna = await join(potPath, 'Anna');
		for (const path of [potPath, anna.personalPath, adminPath]) {
			const html = await (await get(path)).text();
			assert.match(html, /<p class="kicker">Familie Müller 2026<\/p>/, path);
			assert.match(html, /<title>[^<]* · Familie Müller 2026 · Wichteltopf<\/title>/, path);
			assert.match(html, /<meta property="og:title" content="Familie Müller 2026 · [^"]+">/, path);
		}
		assert.match(await (await get(adminPath)).text(), /<summary>Titel ändern<\/summary>/);
		assert.doesNotMatch(await (await get('/')).text(), /kicker/);
	});

	it('is optional, and the admin can set or change it later', async () => {
		const { potPath, adminPath } = await createPot();
		let html = await (await get(adminPath)).text();
		assert.doesNotMatch(html, /kicker/);
		assert.match(html, /Gib dem Topf einen Titel/);

		assert.equal((await post(`${adminPath}/titel`, { title: '<b>Büro</b>' })).status, 303);
		html = await (await get(potPath)).text();
		assert.match(html, /<p class="kicker">&lt;b&gt;Büro&lt;\/b&gt;<\/p>/, 'escaped');
		assert.match(html, /<title>[^<]* · &lt;b&gt;Büro&lt;\/b&gt; · Wichteltopf<\/title>/);

		await post(`${adminPath}/titel`, { title: 'x'.repeat(100) });
		assert.equal((await store.getPot(potPath.slice(1)))?.title.length, 60);

		await post(`${adminPath}/titel`, { title: '' });
		assert.doesNotMatch(await (await get(potPath)).text(), /kicker/);
	});
});

describe('background photos', () => {
	it('shows pots of retired designs with a current photo', async () => {
		const pot = await store.createPot('retired', DEFAULT_LIST_ID);
		const html = await (await get(`/${pot.id}`)).text();
		assert.match(html, new RegExp(`<body data-theme="${THEMES[0]?.id}">`));
		assert.match(html, new RegExp(`<meta name="theme-color" content="${THEMES[0]?.color}">`));
	});

	it('offers all photos on the start page', async () => {
		const html = await (await get('/')).text();
		for (const theme of THEMES)
			assert.ok(html.includes(`src="/static/img/thumb/${theme.id}.webp" alt="${theme.label}"`), theme.id);
	});

	it('every photo has a tag, and every tag has photos', () => {
		for (const theme of THEMES) assert.ok(theme.tags.length, theme.id);
		for (const tag of TAGS)
			assert.ok(
				THEMES.some((theme) => theme.tags.includes(tag.id)),
				tag.id,
			);
	});

	it('offers a filter by tag, preset by the code name list', async () => {
		const html = await (await get('/')).text();
		for (const tag of TAGS)
			assert.ok(html.includes(`<option value="${tag.id}">${tag.label.replace('&', '&amp;')}</option>`), tag.id);
		assert.match(
			html,
			/<label class="theme" data-tags="waldtiere winter">\s*<input type="radio" name="theme" value="hare"/,
		);
		assert.match(html, /value="startrek" data-tag="weltraum">/);
	});
});
