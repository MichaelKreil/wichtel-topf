// Smoke test of a running deployment, read-only (it creates no pots).
// Usage: npm run smoke [-- https://wichteltopf.de]
// Waits until the deployment serves the current asset version, so it can run right after `npm run deploy`.
import { ASSET_VERSION } from '../src/asset-version.ts';
import { THEMES } from '../src/themes.ts';

const base = new URL(process.argv[2] ?? 'https://wichteltopf.de');
const isProduction = base.hostname === 'wichteltopf.de';

const failures: string[] = [];
function check(ok: boolean, message: string): void {
	console.log(`${ok ? '✔' : '✖'} ${message}`);
	if (!ok) failures.push(message);
}

const get = (path: string, init?: RequestInit) => fetch(new URL(path, base), { redirect: 'manual', ...init });

// a new version can take a moment to reach every Cloudflare location
let start = '';
for (let attempt = 0; attempt < 30; attempt++) {
	start = await (await get('/')).text();
	if (start.includes(`?v=${ASSET_VERSION}`)) break;
	await new Promise((r) => setTimeout(r, 2000));
}
check(
	start.includes(`/static/style.css?v=${ASSET_VERSION}`),
	`start page links the current assets (?v=${ASSET_VERSION})`,
);
check(start.includes('Wichteltopf anlegen'), 'start page shows the form');

const home = await get('/');
check(home.status === 200, `GET / → ${home.status}`);
check(home.headers.get('cache-control') === 'no-store', 'pages are not cached');
check(
	/default-src 'self'/.test(home.headers.get('content-security-policy') ?? ''),
	'pages have a content security policy',
);
check(home.headers.get('x-content-type-options') === 'nosniff', 'pages have nosniff');

for (const path of ['/datenschutz', '/healthz']) {
	const res = await get(path);
	check(res.status === 200, `GET ${path} → ${res.status}`);
}
const unknown = await get('/Unbekannt-abcdefgh');
check(unknown.status === 404, `unknown pot → ${unknown.status}`);

const assets: [string, string][] = [
	[`/static/style.css?v=${ASSET_VERSION}`, 'text/css'],
	[`/static/themes.css?v=${ASSET_VERSION}`, 'text/css'],
	[`/static/app.js?v=${ASSET_VERSION}`, 'javascript'],
	['/static/fonts/caveat-600.woff2', 'font/woff2'],
	['/static/og.jpg', 'image/jpeg'],
	['/favicon.ico', 'image/'],
	['/apple-touch-icon.png', 'image/png'],
];
const theme = THEMES[THEMES.length - 1]?.id; // the newest background
for (const path of [
	`/static/img/bg/${theme}-lg.webp`,
	`/static/img/bg/${theme}-sm.webp`,
	`/static/img/thumb/${theme}.webp`,
])
	assets.push([path, 'image/webp']);
for (const [path, type] of assets) {
	const res = await get(path);
	const contentType = res.headers.get('content-type') ?? '';
	check(res.status === 200 && contentType.includes(type), `GET ${path} → ${res.status} ${contentType}`);
}
const css = await get(`/static/style.css?v=${ASSET_VERSION}`);
check(/immutable/.test(css.headers.get('cache-control') ?? ''), 'versioned CSS is cached for good');

// form posts from other sites are rejected
const crossSite = await get('/neu', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } });
check(crossSite.status === 403, `cross-site POST /neu → ${crossSite.status}`);

if (isProduction) {
	const http = await fetch('http://wichteltopf.de/datenschutz', { redirect: 'manual' });
	check(
		http.status === 301 && http.headers.get('location') === 'https://wichteltopf.de/datenschutz',
		`http → ${http.status} ${http.headers.get('location')}`,
	);
	const www = await fetch('https://www.wichteltopf.de/datenschutz', { redirect: 'manual' });
	check(
		www.status === 301 && www.headers.get('location') === 'https://wichteltopf.de/datenschutz',
		`www → ${www.status} ${www.headers.get('location')}`,
	);
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : `\n${base.origin} is fine`);
process.exit(failures.length ? 1 : 0);
